/**
 * Compresses carriage-return based terminal progress output.
 *
 * A carriage return is commonly used to redraw the current progress line. For LLM
 * context we do not need to reproduce the terminal framebuffer exactly; retaining
 * stale suffixes from an earlier frame produces misleading text such as "100%%" or
 * "Donerogress". Instead, each carriage-return separated segment is treated as an
 * ephemeral frame and only the last non-empty frame on each logical line is kept.
 *
 * Empty trailing frames are ignored so "status\r" and CRLF line endings preserve
 * the last visible frame.
 */
export function compressCarriageReturnFrames(input: string): string {
	if (input.indexOf("\r") === -1) return input

	let output = ""
	let lineStart = 0
	const len = input.length

	while (lineStart < len) {
		let lineEnd = input.indexOf("\n", lineStart)
		if (lineEnd === -1) lineEnd = len

		let frameStart = lineStart
		let lastFrameStart = lineStart
		let lastFrameEnd = lineStart
		let crPos = input.indexOf("\r", frameStart)

		if (crPos === -1 || crPos >= lineEnd) {
			output += input.substring(lineStart, lineEnd)
		} else {
			while (crPos !== -1 && crPos < lineEnd) {
				if (crPos > frameStart) {
					lastFrameStart = frameStart
					lastFrameEnd = crPos
				}

				frameStart = crPos + 1
				crPos = input.indexOf("\r", frameStart)
			}

			if (lineEnd > frameStart) {
				lastFrameStart = frameStart
				lastFrameEnd = lineEnd
			}

			output += input.substring(lastFrameStart, lastFrameEnd)
		}

		if (lineEnd < len) output += "\n"
		lineStart = lineEnd + 1
	}

	return output
}

/**
 * Processes backspace characters using a lightweight terminal cursor model.
 *
 * Backspace moves the cursor one position to the left; it does not erase the
 * character by itself. Subsequent text overwrites existing cells, while trailing
 * backspaces leave the visible line intact. Iterating with for...of keeps Unicode
 * code points intact instead of slicing UTF-16 surrogate pairs.
 *
 * This intentionally remains a small progress-output normalizer rather than a full
 * terminal emulator: display-column widths for wide/combining graphemes are not
 * modeled here.
 */
export function processBackspacesWithCursor(input: string): string {
	if (input.indexOf("\b") === -1) return input

	let output = ""
	let cells: string[] = []
	let cursor = 0

	const flushLine = () => {
		output += cells.join("")
		cells = []
		cursor = 0
	}

	for (const char of input) {
		if (char === "\n") {
			flushLine()
			output += "\n"
		} else if (char === "\b") {
			if (cursor > 0) cursor--
		} else {
			if (cursor < cells.length) {
				cells[cursor] = char
			} else {
				cells.push(char)
			}
			cursor++
		}
	}

	flushLine()
	return output
}

/**
 * Removes superseded progress frames while preserving terminal-like backspace
 * cursor semantics for the remaining text.
 */
export function compressTerminalProgress(input: string): string {
	return processBackspacesWithCursor(compressCarriageReturnFrames(input))
}
