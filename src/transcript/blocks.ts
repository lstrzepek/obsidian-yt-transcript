import type { TranscriptBlock, TranscriptLine } from "./types";

export function getTranscriptBlocks(
	lines: TranscriptLine[],
	timestampMod: number,
): TranscriptBlock[] {
	const blocks: TranscriptBlock[] = [];

	let quote = "";
	let quoteTimeOffset = 0;
	lines.forEach((line, i) => {
		if (i === 0) {
			quoteTimeOffset = line.offset;
			quote += line.text + " ";
			return;
		}
		if (i % timestampMod === 0) {
			blocks.push({ quote, quoteTimeOffset });
			quote = "";
			quoteTimeOffset = line.offset;
		}
		quote += line.text + " ";
	});

	if (quote !== "") {
		blocks.push({ quote, quoteTimeOffset });
	}
	return blocks;
}
