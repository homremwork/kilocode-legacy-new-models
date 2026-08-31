from pathlib import Path
import json
import re


def edit(path, fn):
    p = Path(path)
    old = p.read_text()
    new = fn(old)
    if new == old:
        raise RuntimeError(f"{path}: edit made no change")
    p.write_text(new)


def once(s, old, new, label):
    count = s.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 occurrence, got {count}")
    return s.replace(old, new, 1)


edit("packages/types/src/global-settings.ts", lambda s: once(s, '"SambaNovaApiKey"', '"sambaNovaApiKey"', "sambaNova key"))
edit(
    "packages/types/src/vscode-extension-host.ts",
    lambda s: once(
        s,
        '\t| "terminalShellIntegrationDisabled"\n\t| "terminalCommandDelay"',
        '\t| "terminalShellIntegrationDisabled"\n\t| "terminalInlineShellPath"\n\t| "terminalCommandDelay"',
        "ExtensionState",
    ),
)


def provider(s):
    s = once(
        s,
        '\t\t\tterminalShellIntegrationDisabled,\n\t\t\tterminalCommandDelay,',
        '\t\t\tterminalShellIntegrationDisabled,\n\t\t\tterminalInlineShellPath,\n\t\t\tterminalCommandDelay,',
        "provider destructure",
    )
    s = once(
        s,
        '\t\t\tterminalShellIntegrationDisabled: terminalShellIntegrationDisabled ?? true,\n\t\t\tterminalCommandDelay: terminalCommandDelay ?? 0,',
        '\t\t\tterminalShellIntegrationDisabled: terminalShellIntegrationDisabled ?? true,\n\t\t\tterminalInlineShellPath,\n\t\t\tterminalCommandDelay: terminalCommandDelay ?? 0,',
        "provider post state",
    )
    return once(
        s,
        '\t\t\tterminalShellIntegrationDisabled: stateValues.terminalShellIntegrationDisabled ?? true,\n\t\t\tterminalCommandDelay: stateValues.terminalCommandDelay ?? 0,',
        '\t\t\tterminalShellIntegrationDisabled: stateValues.terminalShellIntegrationDisabled ?? true,\n\t\t\tterminalInlineShellPath: stateValues.terminalInlineShellPath,\n\t\t\tterminalCommandDelay: stateValues.terminalCommandDelay ?? 0,',
        "provider getState",
    )


edit("src/core/webview/ClineProvider.ts", provider)


def settings_view(s):
    s = once(
        s,
        '\t\tterminalShellIntegrationDisabled, // Added from upstream\n\t\tterminalCommandDelay,',
        '\t\tterminalShellIntegrationDisabled, // Added from upstream\n\t\tterminalInlineShellPath,\n\t\tterminalCommandDelay,',
        "settings destructure",
    )
    s = once(
        s,
        '\t\t\t\t\tterminalShellIntegrationDisabled,\n\t\t\t\t\tterminalCommandDelay,',
        '\t\t\t\t\tterminalShellIntegrationDisabled,\n\t\t\t\t\tterminalInlineShellPath: terminalInlineShellPath?.trim() || undefined,\n\t\t\t\t\tterminalCommandDelay,',
        "settings save",
    )
    pattern = r'(?m)^(\s*)terminalShellIntegrationDisabled=\{terminalShellIntegrationDisabled\}\n'
    s, count = re.subn(
        pattern,
        lambda m: m.group(0) + m.group(1) + "terminalInlineShellPath={terminalInlineShellPath}\n",
        s,
        count=1,
    )
    if count != 1:
        raise RuntimeError(f"settings props: expected 1 occurrence, got {count}")
    return s


edit("webview-ui/src/components/settings/SettingsView.tsx", settings_view)


def terminal_ui(s):
    s = once(
        s,
        'import { VSCodeCheckbox, VSCodeLink } from "@vscode/webview-ui-toolkit/react"',
        'import { VSCodeCheckbox, VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"',
        "text field import",
    )
    s = once(
        s,
        '\tterminalShellIntegrationDisabled?: boolean\n\tterminalCommandDelay?: number',
        '\tterminalShellIntegrationDisabled?: boolean\n\tterminalInlineShellPath?: string\n\tterminalCommandDelay?: number',
        "terminal prop",
    )
    s = once(
        s,
        '\t\t| "terminalShellIntegrationDisabled"\n\t\t| "terminalCommandDelay"',
        '\t\t| "terminalShellIntegrationDisabled"\n\t\t| "terminalInlineShellPath"\n\t\t| "terminalCommandDelay"',
        "terminal key",
    )
    s = once(
        s,
        '\tterminalShellIntegrationDisabled,\n\tterminalCommandDelay,',
        '\tterminalShellIntegrationDisabled,\n\tterminalInlineShellPath,\n\tterminalCommandDelay,',
        "terminal destructure",
    )
    marker = '\t\t\t\t\t\t{!terminalShellIntegrationDisabled && ('
    field = '''\t\t\t\t\t\t{(terminalShellIntegrationDisabled ?? true) && (\n\t\t\t\t\t\t\t<SearchableSetting settingId="terminal-inline-shell-path" section="terminal" label={t("settings:terminal.inlineShellPath.label")}>\n\t\t\t\t\t\t\t\t<label className="block font-medium mb-1">{t("settings:terminal.inlineShellPath.label")}</label>\n\t\t\t\t\t\t\t\t<VSCodeTextField value={terminalInlineShellPath ?? ""} placeholder="/bin/bash" onInput={(event: any) => setCachedStateField("terminalInlineShellPath", event.target.value)} style={{ width: "100%" }} data-testid="terminal-inline-shell-path-input" />\n\t\t\t\t\t\t\t\t<div className="text-vscode-descriptionForeground text-sm mt-1">{t("settings:terminal.inlineShellPath.description")}</div>\n\t\t\t\t\t\t\t</SearchableSetting>\n\t\t\t\t\t\t)}\n\n\t\t\t\t\t\t{!(terminalShellIntegrationDisabled ?? true) && ('''
    return once(s, marker, field, "terminal UI marker")


edit("webview-ui/src/components/settings/TerminalSettings.tsx", terminal_ui)

p = Path("webview-ui/src/i18n/locales/en/settings.json")
data = json.loads(p.read_text())
terminal = data["terminal"]
if "inlineShellPath" in terminal:
    raise RuntimeError("inlineShellPath translation unexpectedly already exists")
rebuilt = {}
for key, value in terminal.items():
    rebuilt[key] = value
    if key == "shellIntegrationDisabled":
        rebuilt["inlineShellPath"] = {
            "label": "Inline terminal shell path",
            "description": "Shell executable used by the inline terminal. Leave empty to use the system default.",
        }
data["terminal"] = rebuilt
p.write_text(json.dumps(data, ensure_ascii=False, indent="\t") + "\n")


def system_info(s):
    s = once(
        s,
        "export function getSystemInfoSection(cwd: string): string {",
        "export function getSystemInfoSection(cwd: string, shell: string = getShell()): string {",
        "system info signature",
    )
    return once(s, "Default Shell: ${getShell()}", "Default Shell: ${shell}", "system info shell")


edit("src/core/prompts/sections/system-info.ts", system_info)
edit(
    "src/core/prompts/types.ts",
    lambda s: once(
        s,
        "\tnewTaskRequireTodos: boolean\n",
        "\tnewTaskRequireTodos: boolean\n\tterminalShellIntegrationDisabled?: boolean\n\tterminalInlineShellPath?: string\n",
        "prompt settings",
    ),
)


def system_prompt(s):
    s = once(
        s,
        'import { isEmpty } from "../../utils/object"',
        'import { isEmpty } from "../../utils/object"\nimport { getEffectiveShell } from "../../utils/shell"',
        "effective shell import",
    )
    guard = '\tif (!context) {\n\t\tthrow new Error("Extension context is required for generating system prompt")\n\t}\n'
    positions = [m.start() for m in re.finditer(re.escape(guard), s)]
    if len(positions) != 2:
        raise RuntimeError(f"system context guards: expected 2, got {len(positions)}")
    insertion = "\n\tconst effectiveShell = getEffectiveShell(settings?.terminalShellIntegrationDisabled, settings?.terminalInlineShellPath)\n"
    for pos in reversed(positions):
        end = pos + len(guard)
        s = s[:end] + insertion + s[end:]
    s = once(s, "${getSystemInfoSection(cwd)}", "${getSystemInfoSection(cwd, effectiveShell)}", "system info call")
    return once(s, "\t\tshell: vscode.env.shell,", "\t\tshell: effectiveShell,", "custom prompt shell")


edit("src/core/prompts/system.ts", system_prompt)


def preview(s):
    s = once(
        s,
        "\t\tmaxConcurrentFileReads,\n\t\tenableSubfolderRules,",
        "\t\tmaxConcurrentFileReads,\n\t\tenableSubfolderRules,\n\t\tterminalShellIntegrationDisabled,\n\t\tterminalInlineShellPath,",
        "preview state",
    )
    return once(
        s,
        "\t\t\ttoolProtocol,\n\t\t\tisStealthModel:",
        "\t\t\tterminalShellIntegrationDisabled: terminalShellIntegrationDisabled ?? true,\n\t\t\tterminalInlineShellPath,\n\t\t\ttoolProtocol,\n\t\t\tisStealthModel:",
        "preview settings",
    )


edit("src/core/webview/generateSystemPrompt.ts", preview)


def task_prompt(s):
    start = s.find("\t/*private kilocode_change*/ async getSystemPrompt(): Promise<string> {")
    if start < 0:
        raise RuntimeError("Task.ts: getSystemPrompt start not found")
    end = s.find("\n\tprivate getCurrentProfileId", start)
    if end < 0:
        raise RuntimeError("Task.ts: getSystemPrompt end not found")
    segment = s[start:end]
    segment = once(
        segment,
        "\t\t\tapiConfiguration,\n",
        "\t\t\tapiConfiguration,\n\t\t\tterminalShellIntegrationDisabled,\n\t\t\tterminalInlineShellPath,\n",
        "task state",
    )
    segment = once(
        segment,
        "\t\t\t\ttoolProtocol,",
        "\t\t\t\tterminalShellIntegrationDisabled: terminalShellIntegrationDisabled ?? true,\n\t\t\t\tterminalInlineShellPath,\n\t\t\t\ttoolProtocol,",
        "task prompt settings",
    )
    return s[:start] + segment + s[end:]


edit("src/core/task/Task.ts", task_prompt)
print("all guarded inline shell edits applied")
