// kilocode_change - new file
import { describe, it, expect, vi, beforeEach } from "vitest"
import { getOCAModels } from "../oca"

const makeModel = (modelId: string, overrides: Record<string, any> = {}) => ({
	litellm_params: { model: modelId },
	model_info: {
		supported_api_list: ["CHAT_COMPLETIONS"],
		context_window: 4096,
		supports_vision: false,
		supports_caching: false,
		...overrides,
	},
})

describe("getOCAModels", () => {
	const mockHttpClient = { get: vi.fn() }

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("extracts providerName from the prefix before '/' in model ID", async () => {
		mockHttpClient.get.mockResolvedValue({
			status: 200,
			data: { data: [makeModel("openai/gpt-4o")] },
		})

		const models = await getOCAModels("https://example.com", undefined, mockHttpClient)
		expect(models["openai/gpt-4o"]?.providerName).toBe("openai")
	})

	it("extracts providerName from the prefix before '.' in model ID", async () => {
		mockHttpClient.get.mockResolvedValue({
			status: 200,
			data: { data: [makeModel("anthropic.claude-3-7-sonnet-20250219")] },
		})

		const models = await getOCAModels("https://example.com", undefined, mockHttpClient)
		expect(models["anthropic.claude-3-7-sonnet-20250219"]?.providerName).toBe("anthropic")
	})

	it("prefers explicit provider_name from model_info over extracted prefix", async () => {
		mockHttpClient.get.mockResolvedValue({
			status: 200,
			data: {
				data: [makeModel("openai/gpt-4o", { provider_name: "OpenAI" })],
			},
		})

		const models = await getOCAModels("https://example.com", undefined, mockHttpClient)
		expect(models["openai/gpt-4o"]?.providerName).toBe("OpenAI")
	})

	it("returns undefined providerName when model ID has no '/' or '.' separator", async () => {
		mockHttpClient.get.mockResolvedValue({
			status: 200,
			data: { data: [makeModel("gpt-4o")] },
		})

		const models = await getOCAModels("https://example.com", undefined, mockHttpClient)
		// "-" is not a provider separator, only "/" and "." are, so no prefix is extracted
		expect(models["gpt-4o"]?.providerName).toBeUndefined()
	})
})
