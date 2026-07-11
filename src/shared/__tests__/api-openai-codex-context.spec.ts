import type { ModelInfo, ProviderSettings } from "@roo-code/types"

import { getModelMaxOutputTokens } from "../api"

describe("OpenAI Codex context reservation", () => {
	it("reserves only a sentinel token because max_output_tokens is not sent", () => {
		const model: ModelInfo = {
			contextWindow: 372_000,
			maxTokens: 128_000,
			supportsPromptCache: true,
		}
		const settings: ProviderSettings = {
			apiProvider: "openai-codex",
		}

		expect(
			getModelMaxOutputTokens({
				modelId: "gpt-5.6-sol",
				model,
				settings,
			}),
		).toBe(1)
	})
})
