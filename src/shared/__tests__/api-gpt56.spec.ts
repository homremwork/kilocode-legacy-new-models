import type { ModelInfo, ProviderSettings, ReasoningEffortExtended } from "@roo-code/types"

import { shouldUseReasoningEffort } from "../api"

const makeModel = (supportsReasoningEffort: ModelInfo["supportsReasoningEffort"]): ModelInfo => ({
	contextWindow: 372000,
	supportsPromptCache: true,
	supportsReasoningEffort,
})

const makeSettings = (reasoningEffort: ReasoningEffortExtended): ProviderSettings => ({
	enableReasoningEffort: true,
	reasoningEffort,
})

describe("shouldUseReasoningEffort with GPT-5.6 levels", () => {
	it("accepts max when the model advertises max", () => {
		const model = makeModel(["low", "medium", "high", "xhigh", "max"])

		expect(shouldUseReasoningEffort({ model, settings: makeSettings("max") })).toBe(true)
	})

	it("accepts ultra when the model advertises ultra", () => {
		const model = makeModel(["low", "medium", "high", "xhigh", "max", "ultra"])

		expect(shouldUseReasoningEffort({ model, settings: makeSettings("ultra") })).toBe(true)
	})

	it("rejects ultra when the model capability stops at max", () => {
		const model = makeModel(["low", "medium", "high", "xhigh", "max"])

		expect(shouldUseReasoningEffort({ model, settings: makeSettings("ultra") })).toBe(false)
	})
})
