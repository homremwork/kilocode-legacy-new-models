import { modelInfoSchema, reasoningEffortSettingSchema, type ModelInfo } from "../model.js"

describe("GPT-5.6 reasoning effort types", () => {
	it.each(["max", "ultra"] as const)("accepts %s as a persisted reasoning effort", (value) => {
		expect(reasoningEffortSettingSchema.safeParse(value).success).toBe(true)
	})

	it("accepts a Sol-style capability declaration", () => {
		const model: ModelInfo = {
			contextWindow: 372000,
			supportsPromptCache: true,
			supportsReasoningEffort: ["low", "medium", "high", "xhigh", "max", "ultra"],
			reasoningEffort: "low",
		}

		expect(modelInfoSchema.safeParse(model).success).toBe(true)
	})
})
