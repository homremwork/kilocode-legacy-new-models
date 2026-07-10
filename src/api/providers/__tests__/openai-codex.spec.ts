// npx vitest run api/providers/__tests__/openai-codex.spec.ts

import { OpenAiCodexHandler } from "../openai-codex"

describe("OpenAiCodexHandler.getModel", () => {
	it.each([
		["gpt-5.5", "medium"],
		["gpt-5.1", "medium"],
		["gpt-5", "medium"],
		["gpt-5.1-codex", "medium"],
		["gpt-5-codex", "medium"],
		["gpt-5-codex-mini", "medium"],
		["gpt-5.6-sol", "low"],
		["gpt-5.6-terra", "medium"],
		["gpt-5.6-luna", "medium"],
	])("should return specified model and its default effort: %s", (apiModelId, reasoningEffort) => {
		const handler = new OpenAiCodexHandler({ apiModelId })
		const model = handler.getModel()

		expect(model.id).toBe(apiModelId)
		expect(model.info).toBeDefined()
		expect(model.info.reasoningEffort).toBe(reasoningEffort)
	})

	it("should expose the GPT-5.6 Codex capabilities", () => {
		const sol = new OpenAiCodexHandler({ apiModelId: "gpt-5.6-sol" }).getModel().info
		const terra = new OpenAiCodexHandler({ apiModelId: "gpt-5.6-terra" }).getModel().info
		const luna = new OpenAiCodexHandler({ apiModelId: "gpt-5.6-luna" }).getModel().info

		for (const model of [sol, terra, luna]) {
			expect(model.contextWindow).toBe(372000)
			expect(model.maxTokens).toBe(128000)
			expect(model.supportsImages).toBe(true)
			expect(model.supportsVerbosity).toBe(true)
		}

		expect(sol.supportsReasoningEffort).toEqual(["low", "medium", "high", "xhigh", "max", "ultra"])
		expect(terra.supportsReasoningEffort).toEqual(["low", "medium", "high", "xhigh", "max", "ultra"])
		expect(luna.supportsReasoningEffort).toEqual(["low", "medium", "high", "xhigh", "max"])
	})

	it("should fall back to default model when an invalid model id is provided", () => {
		const handler = new OpenAiCodexHandler({ apiModelId: "not-a-real-model" })
		const model = handler.getModel()

		expect(model.id).toBe("gpt-5.5")
		expect(model.info).toBeDefined()
	})
})
