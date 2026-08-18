import type { Anthropic } from "@anthropic-ai/sdk"

import { convertToMistralMessages } from "../mistral-format"

describe("convertToMistralMessages reasoning replay", () => {
	it("replays persisted Mistral thinking chunks before assistant text", () => {
		const assistantMessage = {
			role: "assistant",
			content: [{ type: "text", text: "The answer is 391." }],
			reasoning_details: [
				{
					type: "mistral.thinking",
					chunk: {
						type: "thinking",
						thinking: [{ type: "text", text: "17 * 23 = 391" }],
						signature: "sig-123",
						closed: true,
					},
				},
			],
		} as unknown as Anthropic.Messages.MessageParam

		const [converted] = convertToMistralMessages([assistantMessage])
		const content = (converted as any).content

		expect(content).toEqual([
			{
				type: "thinking",
				thinking: [{ type: "text", text: "17 * 23 = 391" }],
				signature: "sig-123",
				closed: true,
			},
			{ type: "text", text: "The answer is 391." },
		])
	})
})
