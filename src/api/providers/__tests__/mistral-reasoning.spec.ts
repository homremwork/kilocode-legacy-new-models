import { MistralHandler } from "../mistral"

describe("MistralHandler reasoning effort", () => {
	it("exposes selected effort for adjustable reasoning models", () => {
		const handler = new MistralHandler({
			apiModelId: "mistral-small-latest",
			mistralApiKey: "test-key",
			enableReasoningEffort: true,
			reasoningEffort: "high",
		})

		expect(handler.getModel().reasoningEffort).toBe("high")
	})

	it.each(["none", "high"] as const)("supports %s reasoning for Mistral-hosted GLM 5.2", (reasoningEffort) => {
		const handler = new MistralHandler({
			apiModelId: "zai-glm-5-2",
			mistralApiKey: "test-key",
			enableReasoningEffort: true,
			reasoningEffort,
		})

		expect(handler.getModel().reasoningEffort).toBe(reasoningEffort)
	})

	it("rejects unsupported intermediate reasoning efforts for Mistral-hosted GLM 5.2", () => {
		const handler = new MistralHandler({
			apiModelId: "zai-glm-5-2",
			mistralApiKey: "test-key",
			enableReasoningEffort: true,
			reasoningEffort: "medium",
		})

		expect(handler.getModel().reasoningEffort).toBeUndefined()
	})

	it("omits effort when reasoning is explicitly disabled", () => {
		const handler = new MistralHandler({
			apiModelId: "mistral-medium-3-5",
			mistralApiKey: "test-key",
			enableReasoningEffort: false,
			reasoningEffort: "high",
		})

		expect(handler.getModel().reasoningEffort).toBeUndefined()
	})

	it("omits stale effort when the reasoning toggle is unset", () => {
		const handler = new MistralHandler({
			apiModelId: "mistral-small-latest",
			mistralApiKey: "test-key",
			reasoningEffort: "high",
		})

		expect(handler.getModel().reasoningEffort).toBeUndefined()
	})

	it("does not send Kilo-only effort values to Mistral", () => {
		const handler = new MistralHandler({
			apiModelId: "mistral-small-latest",
			mistralApiKey: "test-key",
			enableReasoningEffort: true,
			reasoningEffort: "ultra",
		})

		expect(handler.getModel().reasoningEffort).toBeUndefined()
	})

	it("does not enable adjustable reasoning on unsupported Mistral models", () => {
		const handler = new MistralHandler({
			apiModelId: "codestral-latest",
			mistralApiKey: "test-key",
			enableReasoningEffort: true,
			reasoningEffort: "high",
		})

		expect(handler.getModel().reasoningEffort).toBeUndefined()
	})
})
