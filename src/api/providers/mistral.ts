import { Anthropic } from "@anthropic-ai/sdk"
import { Mistral } from "@mistralai/mistralai"
import { chatCompletionStreamRequestToJSON } from "@mistralai/mistralai/models/components/chatcompletionstreamrequest"
import OpenAI from "openai"

import {
	type MistralModelId,
	type ModelInfo,
	type ReasoningEffortExtended,
	mistralDefaultModelId,
	mistralModels,
	MISTRAL_DEFAULT_TEMPERATURE,
	ApiProviderError,
} from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import { ApiHandlerOptions } from "../../shared/api"

import { convertToMistralMessages, type PersistedMistralThinkingDetail } from "../transform/mistral-format"
import { ApiStream } from "../transform/stream"
import { handleProviderError } from "./utils/error-handler"

import { BaseProvider } from "./base-provider"
import type { SingleCompletionHandler, ApiHandlerCreateMessageMetadata } from "../index"
import { DEFAULT_HEADERS } from "./constants" // kilocode_change
import { streamSse } from "../../services/autocomplete/continuedev/core/fetch/stream" // kilocode_change
import type { CompletionUsage } from "./openrouter" // kilocode_change
import type { FimHandler } from "./kilocode/FimHandler" // kilocode_change

type MistralReasoningEffort = Extract<ReasoningEffortExtended, "none" | "minimal" | "low" | "medium" | "high" | "xhigh">
const MISTRAL_REASONING_EFFORTS = new Set<MistralReasoningEffort>(["none", "minimal", "low", "medium", "high", "xhigh"])

// Type helper to handle thinking chunks from Mistral API
// The SDK includes ThinkChunk but TypeScript has trouble with the discriminated union.
type ContentChunkWithThinking = {
	type: string
	text?: string
	thinking?: Array<Record<string, unknown> & { type: string; text?: string }>
	signature?: string | null
	closed?: boolean
}

// Type for Mistral tool calls in stream delta
type MistralToolCall = {
	id?: string
	type?: string
	function?: {
		name?: string
		arguments?: string
	}
}

// Type for Mistral tool definition - matches Mistral SDK Tool type
type MistralTool = {
	type: "function"
	function: {
		name: string
		description?: string
		parameters: Record<string, unknown>
	}
}

type MistralRequestOptions = {
	model: string
	messages: ReturnType<typeof convertToMistralMessages>
	maxTokens: number
	temperature: number
	tools?: MistralTool[]
	toolChoice?: "auto" | "none" | "any" | "required" | { type: "function"; function: { name: string } }
}

export class MistralHandler extends BaseProvider implements SingleCompletionHandler {
	protected options: ApiHandlerOptions
	private client: Mistral
	private readonly providerName = "Mistral"
	private reasoningDetails: PersistedMistralThinkingDetail[] = []

	constructor(options: ApiHandlerOptions) {
		super()

		if (!options.mistralApiKey) {
			throw new Error("Mistral API key is required")
		}

		const apiModelId = options.apiModelId || mistralDefaultModelId
		this.options = { ...options, apiModelId }

		this.client = new Mistral({
			serverURL: this.getBaseUrl(),
			apiKey: this.options.mistralApiKey,
		})
	}

	private getBaseUrl(): string {
		const modelId = this.options.apiModelId ?? mistralDefaultModelId
		return modelId.startsWith("codestral-")
			? this.options.mistralCodestralUrl || "https://codestral.mistral.ai"
			: "https://api.mistral.ai"
	}

	private getReasoningEffort(info: ModelInfo): MistralReasoningEffort | undefined {
		if (this.options.enableReasoningEffort === false) {
			return undefined
		}

		const effort = this.options.reasoningEffort
		if (!effort || effort === "disable" || !MISTRAL_REASONING_EFFORTS.has(effort as MistralReasoningEffort)) {
			return undefined
		}

		const supported = info.supportsReasoningEffort
		if (Array.isArray(supported) && !supported.includes(effort)) {
			return undefined
		}
		if (!supported) {
			return undefined
		}

		return effort as MistralReasoningEffort
	}

	/**
	 * Kilo persists provider reasoning_details on assistant messages. Exposing the
	 * original Mistral ThinkChunk here lets mistral-format replay it on later turns.
	 */
	getReasoningDetails(): PersistedMistralThinkingDetail[] | undefined {
		return this.reasoningDetails.length > 0 ? this.reasoningDetails : undefined
	}

	private restoreThinkingSignatures(serializedRequest: Record<string, any>, requestOptions: MistralRequestOptions) {
		const serializedMessages = serializedRequest.messages
		if (!Array.isArray(serializedMessages)) return

		requestOptions.messages.forEach((sourceMessage, messageIndex) => {
			const sourceContent = (sourceMessage as any).content
			const serializedContent = serializedMessages[messageIndex]?.content
			if (!Array.isArray(sourceContent) || !Array.isArray(serializedContent)) return

			sourceContent.forEach((sourceChunk: any, chunkIndex: number) => {
				if (sourceChunk?.type !== "thinking") return
				const serializedChunk = serializedContent[chunkIndex]
				if (!serializedChunk || serializedChunk.type !== "thinking") return
				if (sourceChunk.signature !== undefined) serializedChunk.signature = sourceChunk.signature
				if (sourceChunk.closed !== undefined) serializedChunk.closed = sourceChunk.closed
			})
		})
	}

	private async createReasoningResponse(
		requestOptions: MistralRequestOptions,
		reasoningEffort: MistralReasoningEffort,
	): Promise<AsyncIterable<{ data: any }>> {
		// SDK 1.9.x predates reasoning_effort and strips unknown fields from its
		// generated outbound schema. Serialize all known fields with the SDK, add
		// the current API field explicitly, then stream the standard SSE response.
		const serializedRequest = JSON.parse(
			chatCompletionStreamRequestToJSON({ ...requestOptions, stream: true } as any),
		) as Record<string, any>
		serializedRequest.reasoning_effort = reasoningEffort
		this.restoreThinkingSignatures(serializedRequest, requestOptions)

		const baseUrl = this.getBaseUrl().endsWith("/") ? this.getBaseUrl() : `${this.getBaseUrl()}/`
		const endpoint = new URL("v1/chat/completions", baseUrl)
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				...DEFAULT_HEADERS,
				"Content-Type": "application/json",
				Accept: "text/event-stream",
				Authorization: `Bearer ${this.options.mistralApiKey}`,
			},
			body: JSON.stringify(serializedRequest),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`)
		}

		return {
			[Symbol.asyncIterator]: async function* () {
				for await (const data of streamSse(response)) {
					yield { data }
				}
			},
		}
	}

	override async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		this.reasoningDetails = []
		const { id: model, info, maxTokens, temperature, reasoningEffort } = this.getModel()

		const requestOptions: MistralRequestOptions = {
			model,
			messages: [{ role: "system", content: systemPrompt }, ...convertToMistralMessages(messages)],
			maxTokens: maxTokens ?? info.maxTokens ?? 8192,
			temperature,
		}

		const supportsNativeTools = info.supportsNativeTools ?? false
		if (metadata?.tools && metadata.tools.length > 0 && metadata?.toolProtocol !== "xml" && supportsNativeTools) {
			requestOptions.tools = this.convertToolsForMistral(metadata.tools)
			requestOptions.toolChoice = "any"
		}

		let response: AsyncIterable<{ data: any }>
		try {
			response = reasoningEffort
				? await this.createReasoningResponse(requestOptions, reasoningEffort)
				: (await this.client.chat.stream(requestOptions))
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			const apiError = new ApiProviderError(errorMessage, this.providerName, model, "createMessage")
			TelemetryService.instance.captureException(apiError)
			throw new Error(`Mistral completion error: ${errorMessage}`)
		}

		for await (const event of response) {
			const delta = event.data.choices[0]?.delta

			if (delta?.content) {
				if (typeof delta.content === "string") {
					yield { type: "text", text: delta.content }
				} else if (Array.isArray(delta.content)) {
					for (const chunk of delta.content as ContentChunkWithThinking[]) {
						if (chunk.type === "thinking" && chunk.thinking) {
							this.reasoningDetails.push({
								type: "mistral.thinking",
								chunk: {
									type: "thinking",
									thinking: chunk.thinking.map((part) => ({ ...part })),
									...(chunk.signature !== undefined ? { signature: chunk.signature } : {}),
									...(chunk.closed !== undefined ? { closed: chunk.closed } : {}),
								},
							})

							for (const thinkingPart of chunk.thinking) {
								if (thinkingPart.type === "text" && thinkingPart.text) {
									yield { type: "reasoning", text: thinkingPart.text }
								}
							}
						} else if (chunk.type === "text" && chunk.text) {
							yield { type: "text", text: chunk.text }
						}
					}
				}
			}

			const toolCalls = (delta as { toolCalls?: MistralToolCall[]; tool_calls?: MistralToolCall[] })?.toolCalls ??
				(delta as { tool_calls?: MistralToolCall[] })?.tool_calls
			if (toolCalls) {
				for (let i = 0; i < toolCalls.length; i++) {
					const toolCall = toolCalls[i]
					yield {
						type: "tool_call_partial",
						index: i,
						id: toolCall.id,
						name: toolCall.function?.name,
						arguments: toolCall.function?.arguments,
					}
				}
			}

			if (event.data.usage) {
				const usage = event.data.usage
				yield {
					type: "usage",
					inputTokens: usage.promptTokens ?? usage.prompt_tokens ?? 0,
					outputTokens: usage.completionTokens ?? usage.completion_tokens ?? 0,
				}
			}
		}
	}

	private convertToolsForMistral(tools: OpenAI.Chat.ChatCompletionTool[]): MistralTool[] {
		return tools
			.filter((tool) => tool.type === "function")
			.map((tool) => ({
				type: "function" as const,
				function: {
					name: tool.function.name,
					description: tool.function.description,
					parameters: (tool.function.parameters as Record<string, unknown>) || {},
				},
			}))
	}

	override getModel() {
		const id = this.options.apiModelId ?? mistralDefaultModelId
		const info = mistralModels[id as MistralModelId] ?? mistralModels[mistralDefaultModelId]
		const maxTokens = this.options.includeMaxTokens ? info.maxTokens : undefined
		const temperature = this.options.modelTemperature ?? MISTRAL_DEFAULT_TEMPERATURE
		const reasoningEffort = this.getReasoningEffort(info)

		return { id, info, maxTokens, temperature, reasoningEffort }
	}

	async completePrompt(prompt: string): Promise<string> {
		const { id: model, temperature } = this.getModel()

		try {
			const response = await this.client.chat.complete({
				model,
				messages: [{ role: "user", content: prompt }],
				temperature,
			})

			const content = response.choices?.[0]?.message.content

			if (Array.isArray(content)) {
				return (content as ContentChunkWithThinking[])
					.filter((c) => c.type === "text" && c.text)
					.map((c) => c.text || "")
					.join("")
			}

			return content || ""
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			const apiError = new ApiProviderError(errorMessage, this.providerName, model, "completePrompt")
			TelemetryService.instance.captureException(apiError)
			throw new Error(`Mistral completion error: ${errorMessage}`)
		}
	}

	// kilocode_change start
	fimSupport(): FimHandler | undefined {
		const modelId = this.options.apiModelId ?? mistralDefaultModelId
		if (!modelId.startsWith("codestral-")) {
			return undefined
		}

		return {
			streamFim: this.streamFim.bind(this),
			getModel: () => this.getModel(),
			getTotalCost: (usage: CompletionUsage) => {
				const { info } = this.getModel()
				const inputCost = ((usage.prompt_tokens ?? 0) / 1_000_000) * (info.inputPrice ?? 0)
				const outputCost = ((usage.completion_tokens ?? 0) / 1_000_000) * (info.outputPrice ?? 0)
				return inputCost + outputCost
			},
		}
	}

	private async *streamFim(
		prefix: string,
		suffix: string,
		_taskId?: string,
		onUsage?: (usage: CompletionUsage) => void,
	): AsyncGenerator<string> {
		const { id: model, maxTokens } = this.getModel()
		const baseUrl = this.getBaseUrl()
		const endpoint = new URL("v1/fim/completions", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`)

		const headers: Record<string, string> = {
			...DEFAULT_HEADERS,
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${this.options.mistralApiKey}`,
		}

		const temperature = 0.2
		const requestMaxTokens = 256

		const response = await fetch(endpoint, {
			method: "POST",
			body: JSON.stringify({
				model,
				prompt: prefix,
				suffix,
				max_tokens: Math.min(requestMaxTokens, maxTokens ?? requestMaxTokens),
				temperature,
				stream: true,
			}),
			headers,
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`FIM streaming failed: ${response.status} ${response.statusText} - ${errorText}`)
		}

		for await (const data of streamSse(response)) {
			const content = data.choices?.[0]?.delta?.content
			if (content) {
				yield content
			}

			if (data.usage && onUsage) {
				onUsage({
					prompt_tokens: data.usage.prompt_tokens,
					completion_tokens: data.usage.completion_tokens,
					total_tokens: data.usage.total_tokens,
				})
			}
		}
	}
	// kilocode_change end
}
