import { render, screen } from "@/utils/test-utils"

import type { ModelInfo } from "@roo-code/types"

import { ThinkingBudget } from "../ThinkingBudget"

vi.mock("@/components/ui", () => ({
	Slider: () => null,
	Select: ({ children }: any) => <div>{children}</div>,
	SelectTrigger: ({ children }: any) => <button>{children}</button>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ children, value }: any) => <div data-testid={`select-item-${value}`}>{children}</div>,
}))

vi.mock("@/components/ui/hooks/useSelectedModel", () => ({
	useSelectedModel: () => ({ id: "gpt-5.6-sol", provider: "openai-codex", info: undefined }),
}))

describe("ThinkingBudget GPT-5.6 reasoning levels", () => {
	const modelInfo: ModelInfo = {
		contextWindow: 372000,
		supportsPromptCache: true,
		supportsReasoningEffort: ["low", "medium", "high", "xhigh", "max", "ultra"],
		reasoningEffort: "low",
	}

	it("renders max and ultra from an explicit capability array", () => {
		render(
			<ThinkingBudget
				apiConfiguration={{ apiProvider: "openai-codex", apiModelId: "gpt-5.6-sol" }}
				setApiConfigurationField={vi.fn()}
				modelInfo={modelInfo}
			/>,
		)

		expect(screen.getByTestId("select-item-max")).toBeInTheDocument()
		expect(screen.getByTestId("select-item-ultra")).toBeInTheDocument()
		expect(screen.queryByTestId("select-item-disable")).not.toBeInTheDocument()
	})
})
