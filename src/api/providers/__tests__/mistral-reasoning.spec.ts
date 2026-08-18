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

	it("omits effort when reasoning is explicitly disabled", () => {
		const handler = new MistralHandler({
			apiModelId: "mistral-medium-3-5",
			mistralApiKey: "test-key",
			enableReasoningEffort: false,
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
