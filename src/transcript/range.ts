import type { TranscriptLine } from "./types";

export interface TranscriptLineRange {
	startMs?: number;
	endMs?: number;
}

export function filterTranscriptLinesByRange(
	lines: TranscriptLine[],
	range: TranscriptLineRange,
): TranscriptLine[] {
	const { startMs, endMs } = range;
	if (startMs === undefined && endMs === undefined) return lines;

	return lines.filter((line) => {
		const lineStart = line.offset;
		const lineEnd = line.offset + line.duration;

		if (startMs !== undefined && lineEnd <= startMs) return false;
		if (endMs !== undefined && lineStart >= endMs) return false;
		return true;
	});
}
