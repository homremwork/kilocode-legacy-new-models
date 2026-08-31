import {
	compressCarriageReturnFrames,
	compressTerminalProgress,
	processBackspacesWithCursor,
} from "../compress-terminal-progress"

describe("compressCarriageReturnFrames", () => {
	it("keeps only the final progress frame", () => {
		const input = "Progress: [===>---------] 30%\rProgress: [======>------] 60%\rProgress: [==========>] 100%"
		expect(compressCarriageReturnFrames(input)).toBe("Progress: [==========>] 100%")
	})

	it("compresses carriage-return frames independently on each line", () => {
		const input = "Line 1\rUpdated Line 1\nLine 2\rUpdated Line 2\rFinal Line 2"
		expect(compressCarriageReturnFrames(input)).toBe("Updated Line 1\nFinal Line 2")
	})

	it("preserves the last non-empty frame when a line ends with carriage returns", () => {
		expect(compressCarriageReturnFrames("Initial text\rReplacement text\r")).toBe("Replacement text")
		expect(compressCarriageReturnFrames("Initial\r\r\r\rFinal")).toBe("Final")
		expect(compressCarriageReturnFrames("Start\r\r\r\r\rEnd")).toBe("End")
		expect(compressCarriageReturnFrames("\r\r\r\r")).toBe("")
	})

	it("normalizes CRLF as a logical line break", () => {
		expect(compressCarriageReturnFrames("Line1\r\nLine2\rLine2Updated\nLine3\r\n")).toBe(
			"Line1\nLine2Updated\nLine3\n",
		)
	})

	it("does not retain stale suffixes from superseded frames", () => {
		const input =
			"Step 1: Starting\rStep 1: In progress\rStep 1: Done\nStep 2: Starting\rStep 2: In progress\rStep 2: Done"
		expect(compressCarriageReturnFrames(input)).toBe("Step 1: Done\nStep 2: Done")
		expect(compressCarriageReturnFrames("Initial text\rnext\r")).toBe("next")
	})

	it("keeps the final Unicode frame intact", () => {
		expect(compressCarriageReturnFrames("Line with 🚀 emoji\rLine with a")).toBe("Line with a")
		expect(compressCarriageReturnFrames("Line with not a emoji\rLine with 🔥 emoji")).toBe("Line with 🔥 emoji")
		expect(compressCarriageReturnFrames("你好世界啊\r你好地球")).toBe("你好地球")
	})

	it("handles many progress frames", () => {
		let input = ""
		for (let i = 0; i < 10000; i++) input += `Progress: ${i / 100}%\r`
		input += "Progress: 100%"
		expect(compressCarriageReturnFrames(input)).toBe("Progress: 100%")
	})
})

describe("processBackspacesWithCursor", () => {
	it("moves the cursor left and overwrites existing characters", () => {
		expect(processBackspacesWithCursor("abc\b\bxy")).toBe("axy")
		expect(processBackspacesWithCursor("abcdef\b\b\b\bxy")).toBe("abxyef")
	})

	it("ignores backspaces before the start of a line", () => {
		expect(processBackspacesWithCursor("\b\babc")).toBe("abc")
		expect(processBackspacesWithCursor("abc\b\b\b\b\b\bdef")).toBe("def")
	})

	it("preserves visible text when backspaces are not followed by writes", () => {
		expect(processBackspacesWithCursor("abc\b\b")).toBe("abc")
		expect(processBackspacesWithCursor("abc\b\n123\b\b")).toBe("abc\n123")
	})

	it("matches terminal-style overwrite behavior for spinner-like output", () => {
		const input = "Loading[\b\b\b\b\b\b\b\bProgress[\b\b\b\b\b\b\b\b\bStatus: \b\b\b\b\b\b\b\bDone!"
		expect(processBackspacesWithCursor(input)).toBe("Done!s: [")
	})

	it("keeps Unicode code points intact", () => {
		expect(processBackspacesWithCursor("abc😀\b\bdef🎉\b\b\bghi")).toBe("abdghi")
	})
})

describe("compressTerminalProgress", () => {
	it("applies carriage-return compression before backspace cursor handling", () => {
		const input = "Loading 10%\rDone!!\b!"
		expect(compressTerminalProgress(input)).toBe("Done!!")
	})
})
