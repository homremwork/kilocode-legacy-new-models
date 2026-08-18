/*
Semantics for Reasoning Effort (ThinkingBudget)

Capability surface:
- modelInfo.supportsReasoningEffort: boolean | Array<"disable" | "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max" | "ultra">
  - true  → UI shows ["low","medium","high","xhigh"]
  - array → UI shows exactly the provided values
- modelInfo.supportsReasoningBinary + supportsReasoningEffort → render an explicit reasoning toggle plus effort selector.

Selection behavior:
- "disable":
  - set enableReasoningEffort = false
  - persist reasoningEffort = "disable"
  - request builders omit any reasoning parameter/body sections
- "none":
  - set enableReasoningEffort = true
  - persist reasoningEffort = "none"
  - request builders include reasoning with value "none"
- Other capability values:
  - set enableReasoningEffort = true
  - persist the selected value
  - request builders include reasoning with the selected effort
*/

import { useEffect } from "react"
import { Checkbox } from "vscrui"

import {
	type ProviderSettings,
	type ModelInfo,
	type ReasoningEffortExtended,
	reasoningEfforts,
} from "@roo-code/types"

import {
	DEFAULT_HYBRID_REASONING_MODEL_MAX_TOKENS,
	DEFAULT_HYBRID_REASONING_MODEL_THINKING_TOKENS,
	GEMINI_25_PRO_MIN_THINKING_TOKENS,
} from "@roo/api"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { Slider, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@src/components/ui"
import { useSelectedModel } from "@src/components/ui/hooks/useSelectedModel"

interface ThinkingBudgetProps {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: <K extends keyof ProviderSettings>(
		field: K,
		value: ProviderSettings[K],
		isUserAction?: boolean,
	) => void
	modelInfo?: ModelInfo
}

type ReasoningEffortOption = ReasoningEffortExtended | "disable"

const reasoningEffortFallbackLabels: Partial<Record<ReasoningEffortOption, string>> = {
	max: "Maximum",
	ultra: "Ultra",
}

export const ThinkingBudget = ({ apiConfiguration, setApiConfigurationField, modelInfo }: ThinkingBudgetProps) => {
	const { t } = useAppTranslation()
	const { id: selectedModelId } = useSelectedModel(apiConfiguration)

	const getReasoningEffortLabel = (value: ReasoningEffortOption) => {
		if (value === "disable") {
			return t("settings:providers.reasoningEffort.auto", { defaultValue: "Default / Auto" })
		}
		if (value === "none") {
			return t("settings:providers.reasoningEffort.none")
		}

		return t(`settings:providers.reasoningEffort.${value}`, {
			defaultValue: reasoningEffortFallbackLabels[value] ?? value,
		})
	}

	const isGemini25Pro = selectedModelId && selectedModelId.includes("gemini-2.5-pro")
	const minThinkingTokens = isGemini25Pro ? GEMINI_25_PRO_MIN_THINKING_TOKENS : 1024

	const isReasoningSupported = !!modelInfo && modelInfo.supportsReasoningBinary
	const isReasoningBudgetSupported = !!modelInfo && modelInfo.supportsReasoningBudget
	const isReasoningBudgetRequired = !!modelInfo && modelInfo.requiredReasoningBudget
	const isReasoningEffortSupported = !!modelInfo && modelInfo.supportsReasoningEffort
	const hasCombinedReasoningControls = isReasoningSupported && isReasoningEffortSupported

	const supports = modelInfo?.supportsReasoningEffort
	const baseAvailableOptions: ReadonlyArray<ReasoningEffortOption> =
		supports === true
			? reasoningEfforts
			: Array.isArray(supports)
				? supports
				: reasoningEfforts

	const shouldAutoAddDisable =
		!hasCombinedReasoningControls &&
		!modelInfo?.requiredReasoningEffort &&
		supports === true &&
		!baseAvailableOptions.includes("disable")
	const availableOptions: ReadonlyArray<ReasoningEffortOption> = shouldAutoAddDisable
		? ["disable", ...baseAvailableOptions]
		: baseAvailableOptions

	const modelDefaultReasoningEffort = modelInfo?.reasoningEffort
	const defaultReasoningEffort: ReasoningEffortOption = modelInfo?.requiredReasoningEffort
		? modelDefaultReasoningEffort || "medium"
		: "disable"
	const storedReasoningEffort = apiConfiguration.reasoningEffort as ReasoningEffortOption | undefined
	const currentReasoningEffort: ReasoningEffortOption = storedReasoningEffort || defaultReasoningEffort

	useEffect(() => {
		if (isReasoningEffortSupported && !apiConfiguration.reasoningEffort) {
			if (modelInfo?.requiredReasoningEffort && defaultReasoningEffort !== "disable") {
				setApiConfigurationField("reasoningEffort", defaultReasoningEffort, false)
			}
		}
	}, [
		isReasoningEffortSupported,
		apiConfiguration.reasoningEffort,
		defaultReasoningEffort,
		modelInfo?.requiredReasoningEffort,
		setApiConfigurationField,
	])

	useEffect(() => {
		if (!isReasoningEffortSupported || hasCombinedReasoningControls) return
		const shouldEnable = modelInfo?.requiredReasoningEffort || currentReasoningEffort !== "disable"
		if (shouldEnable && apiConfiguration.enableReasoningEffort !== true) {
			setApiConfigurationField("enableReasoningEffort", true, false)
		}
	}, [
		isReasoningEffortSupported,
		hasCombinedReasoningControls,
		modelInfo?.requiredReasoningEffort,
		currentReasoningEffort,
		apiConfiguration.enableReasoningEffort,
		setApiConfigurationField,
	])

	const enableReasoningEffort = apiConfiguration.enableReasoningEffort
	const enableBinaryReasoningEffort = apiConfiguration.enableReasoningEffort ?? true
	const combinedReasoningEnabled = apiConfiguration.enableReasoningEffort ?? false
	const customMaxOutputTokens = apiConfiguration.modelMaxTokens || DEFAULT_HYBRID_REASONING_MODEL_MAX_TOKENS
	const customMaxThinkingTokens =
		apiConfiguration.modelMaxThinkingTokens || DEFAULT_HYBRID_REASONING_MODEL_THINKING_TOKENS

	const modelMaxThinkingTokens = modelInfo?.maxThinkingTokens
		? Math.min(modelInfo.maxThinkingTokens, Math.floor(0.8 * customMaxOutputTokens))
		: Math.floor(0.8 * customMaxOutputTokens)

	useEffect(() => {
		if (isReasoningBudgetSupported && customMaxThinkingTokens > modelMaxThinkingTokens) {
			setApiConfigurationField("modelMaxThinkingTokens", modelMaxThinkingTokens, false)
		}
	}, [isReasoningBudgetSupported, customMaxThinkingTokens, modelMaxThinkingTokens, setApiConfigurationField])

	useEffect(() => {
		if (isReasoningBudgetSupported && modelInfo?.maxTokens && customMaxOutputTokens > modelInfo.maxTokens) {
			setApiConfigurationField("modelMaxTokens", modelInfo.maxTokens || DEFAULT_HYBRID_REASONING_MODEL_MAX_TOKENS)
		}
	}, [isReasoningBudgetSupported, customMaxOutputTokens, modelInfo?.maxTokens, setApiConfigurationField])

	if (!modelInfo) {
		return null
	}

	if (isReasoningSupported && !isReasoningEffortSupported) {
		return (
			<div className="flex flex-col gap-1">
				<Checkbox
					checked={enableBinaryReasoningEffort}
					onChange={(checked: boolean) =>
						setApiConfigurationField("enableReasoningEffort", checked === true)
					}>
					{t("settings:providers.useReasoning")}
				</Checkbox>
			</div>
		)
	}

	return isReasoningBudgetSupported && !!modelInfo.maxTokens ? (
		<>
			{!isReasoningBudgetRequired &&
				apiConfiguration.apiProvider !== "virtual-quota-fallback" /*kilocode_change*/ && (
					<div className="flex flex-col gap-1">
						<Checkbox
							checked={enableReasoningEffort}
							onChange={(checked: boolean) =>
								setApiConfigurationField("enableReasoningEffort", checked === true)
							}>
							{t("settings:providers.useReasoning")}
						</Checkbox>
					</div>
				)}
			{(isReasoningBudgetRequired || enableReasoningEffort) && (
				<>
					<div className="flex flex-col gap-1">
						<div className="font-medium">{t("settings:thinkingBudget.maxTokens")}</div>
						<div className="flex items-center gap-1">
							<Slider
								min={8192}
								max={Math.max(
									modelInfo.maxTokens || 8192,
									customMaxOutputTokens,
									DEFAULT_HYBRID_REASONING_MODEL_MAX_TOKENS,
								)}
								step={1024}
								value={[customMaxOutputTokens]}
								onValueChange={([value]) => setApiConfigurationField("modelMaxTokens", value)}
							/>
							<div className="w-12 text-sm text-center">{customMaxOutputTokens}</div>
						</div>
					</div>
					<div className="flex flex-col gap-1">
						<div className="font-medium">{t("settings:thinkingBudget.maxThinkingTokens")}</div>
						<div className="flex items-center gap-1" data-testid="reasoning-budget">
							<Slider
								min={minThinkingTokens}
								max={modelMaxThinkingTokens}
								step={minThinkingTokens === 128 ? 128 : 1024}
								value={[customMaxThinkingTokens]}
								onValueChange={([value]) => setApiConfigurationField("modelMaxThinkingTokens", value)}
							/>
							<div className="w-12 text-sm text-center">{customMaxThinkingTokens}</div>
						</div>
					</div>
				</>
			)}
		</>
	) : isReasoningEffortSupported ? (
		<div className="flex flex-col gap-2" data-testid="reasoning-effort">
			{hasCombinedReasoningControls && (
				<div className="flex flex-col gap-1">
					<Checkbox
						checked={combinedReasoningEnabled}
						onChange={(checked: boolean) => {
							setApiConfigurationField("enableReasoningEffort", checked === true)
							if (checked && (!storedReasoningEffort || storedReasoningEffort === "disable")) {
								setApiConfigurationField("reasoningEffort", modelDefaultReasoningEffort || "high")
							}
						}}>
						{t("settings:providers.useReasoning")}
					</Checkbox>
				</div>
			)}
			{(!hasCombinedReasoningControls || combinedReasoningEnabled) && (
				<>
					<div className="flex justify-between items-center">
						<label className="block font-medium mb-1">{t("settings:providers.reasoningEffort.label")}</label>
					</div>
					<Select
						value={currentReasoningEffort === "disable" ? (modelDefaultReasoningEffort || "high") : currentReasoningEffort}
						onValueChange={(value: ReasoningEffortOption) => {
							if (value === "disable") {
								setApiConfigurationField("enableReasoningEffort", false)
								setApiConfigurationField("reasoningEffort", "disable")
							} else {
								setApiConfigurationField("enableReasoningEffort", true)
								setApiConfigurationField("reasoningEffort", value)
							}
						}}>
						<SelectTrigger className="w-full">
							<SelectValue
								placeholder={getReasoningEffortLabel(
									currentReasoningEffort === "disable" ? (modelDefaultReasoningEffort || "high") : currentReasoningEffort,
								)}
							/>
						</SelectTrigger>
						<SelectContent>
							{availableOptions.map((value) => (
								<SelectItem key={value} value={value}>
									{getReasoningEffortLabel(value)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</>
			)}
		</div>
	) : null
}
