import { filterTranscriptLinesByRange } from "src/transcript/range";
import type { TranscriptLine } from "src/transcript/types";

describe("filterTranscriptLinesByRange", () => {
	const lines: TranscriptLine[] = [
		{ text: "line 1", offset: 0, duration: 2000 },
		{ text: "line 2", offset: 2000, duration: 2000 },
		{ text: "line 3", offset: 4000, duration: 2000 },
		{ text: "line 4", offset: 6000, duration: 2000 },
	];

	it("returns all lines when no range is provided", () => {
		expect(filterTranscriptLinesByRange(lines, {})).toEqual(lines);
	});

	it("filters lines before start time", () => {
		expect(
			filterTranscriptLinesByRange(lines, {
				startMs: 3000,
			}).map((line) => line.text),
		).toEqual(["line 2", "line 3", "line 4"]);
	});

	it("filters lines after end time", () => {
		expect(
			filterTranscriptLinesByRange(lines, {
				endMs: 4500,
			}).map((line) => line.text),
		).toEqual(["line 1", "line 2", "line 3"]);
	});

	it("filters to an inclusive overlap window", () => {
		expect(
			filterTranscriptLinesByRange(lines, {
				startMs: 3000,
				endMs: 6500,
			}).map((line) => line.text),
		).toEqual(["line 2", "line 3", "line 4"]);
	});
});
