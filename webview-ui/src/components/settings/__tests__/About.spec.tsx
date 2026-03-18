import { render, screen, fireEvent } from "@/utils/test-utils"

import { TranslationProvider } from "@/i18n/__mocks__/TranslationContext"

import { About } from "../About"

const mockPostMessage = vi.fn()

vi.mock("@/utils/vscode", () => ({
	vscode: { postMessage: (...args: unknown[]) => mockPostMessage(...args) },
}))

vi.mock("@/i18n/TranslationContext", () => {
	const actual = vi.importActual("@/i18n/TranslationContext")
	return {
		...actual,
		useAppTranslation: () => ({
			t: (key: string) => key,
		}),
	}
})

vi.mock("@roo/package", () => ({
	Package: {
		version: "1.0.0",
		sha: "abc12345",
	},
}))

// kilocode_change: our about screen is very different
describe.skip("About (upstream tests)", () => {
	const defaultProps = {
		telemetrySetting: "enabled" as const,
		setTelemetrySetting: vi.fn(),
		isVsCode: true,
		isPreRelease: false,
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("renders the About section header", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:sections.about")).toBeInTheDocument()
	})

	it("displays version information", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText(/Version: 1\.0\.0/)).toBeInTheDocument()
	})

	it("renders the bug report section with label and link text", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:about.bugReport.label")).toBeInTheDocument()
		expect(screen.getByText("settings:about.bugReport.link")).toBeInTheDocument()
	})

	it("renders the feature request section with label and link text", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:about.featureRequest.label")).toBeInTheDocument()
		expect(screen.getByText("settings:about.featureRequest.link")).toBeInTheDocument()
	})

	it("renders the security issue section with label and link text", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:about.securityIssue.label")).toBeInTheDocument()
		expect(screen.getByText("settings:about.securityIssue.link")).toBeInTheDocument()
	})

	it("renders the contact section with label and email", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:about.contact.label")).toBeInTheDocument()
		expect(screen.getByText("support@roocode.com")).toBeInTheDocument()
	})

	it("renders export, import, and reset buttons", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:footer.settings.export")).toBeInTheDocument()
		expect(screen.getByText("settings:footer.settings.import")).toBeInTheDocument()
		expect(screen.getByText("settings:footer.settings.reset")).toBeInTheDocument()
	})
})

// kilocode_change start: Pre-release channel tests
describe("About - Pre-release Channel", () => {
	const defaultProps = {
		telemetrySetting: "enabled" as const,
		setTelemetrySetting: vi.fn(),
		isVsCode: true,
		isPreRelease: false,
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("shows 'Switch to Pre-release' button when not on pre-release", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} isPreRelease={false} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:footer.preRelease.switchButton")).toBeInTheDocument()
		expect(screen.queryByText("settings:footer.preRelease.alreadyOnPreRelease")).not.toBeInTheDocument()
	})

	it("shows disabled 'You're on Pre-release' button when on pre-release", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} isPreRelease={true} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:footer.preRelease.alreadyOnPreRelease")).toBeInTheDocument()
		const button = screen.getByText("settings:footer.preRelease.alreadyOnPreRelease").closest("button")
		expect(button).toBeDisabled()
		expect(screen.queryByText("settings:footer.preRelease.switchButton")).not.toBeInTheDocument()
	})

	it("sends switchToPreRelease message when button is clicked", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} isPreRelease={false} />
			</TranslationProvider>,
		)
		const button = screen.getByText("settings:footer.preRelease.switchButton")
		fireEvent.click(button)
		expect(mockPostMessage).toHaveBeenCalledWith({ type: "switchToPreRelease" })
	})

	it("renders pre-release section title and description", () => {
		render(
			<TranslationProvider>
				<About {...defaultProps} isPreRelease={false} />
			</TranslationProvider>,
		)
		expect(screen.getByText("settings:footer.preRelease.title")).toBeInTheDocument()
		expect(screen.getByText("settings:footer.preRelease.description")).toBeInTheDocument()
	})
})
// kilocode_change end
