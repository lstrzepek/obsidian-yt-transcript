import { Chapter, TranscriptLine, TranscriptBlock } from "./types";

/**
 * Highlights matched text in the div
 * @param div - the div that we want to highlight
 * @param searchValue - the value that will be highlight
 */
export const highlightText = (div: HTMLElement, searchValue: string) => {
	const content = div.innerHTML;
	const highlightedContent = content.replace(
		new RegExp(searchValue, "gi"),
		'<span class="yt-transcript__highlight">$&</span>',
	);
	div.innerHTML = highlightedContent;
};

/**
 * Finds the chapter that starts at or after the given offset
 * @param chapters - array of chapters sorted by startTime
 * @param offset - time offset in milliseconds
 * @param usedChapters - set of chapter titles already used
 * @returns the next chapter that hasn't been used, or undefined
 */
const findNextChapter = (
	chapters: Chapter[],
	offset: number,
	usedChapters: Set<string>,
): Chapter | undefined => {
	for (const chapter of chapters) {
		if (chapter.startTime >= offset && !usedChapters.has(chapter.title)) {
			return chapter;
		}
	}
	return undefined;
};

/**
 * Gets an array of transcript render blocks
 * Chapters break the normal interval and appear at their exact timestamp.
 * @param data - the transcript data
 * @param timestampMod - the number of lines between each timestamp block
 * @param chapters - optional array of chapters to include in blocks
 */
export const getTranscriptBlocks = (
	data: TranscriptLine[],
	timestampMod: number,
	chapters?: Chapter[],
): TranscriptBlock[] => {
	const transcriptBlocks: TranscriptBlock[] = [];

	if (data.length === 0) {
		return transcriptBlocks;
	}

	// Sort chapters by start time
	const sortedChapters = chapters
		? [...chapters].sort((a, b) => a.startTime - b.startTime)
		: [];
	const usedChapters = new Set<string>();

	let quote = "";
	let quoteTimeOffset = data[0].offset;
	let lineCountInBlock = 0;
	let currentChapter: string | undefined;

	// Check if first line starts with a chapter
	if (sortedChapters.length > 0) {
		const firstChapter = sortedChapters[0];
		if (firstChapter.startTime <= data[0].offset) {
			currentChapter = firstChapter.title;
			usedChapters.add(firstChapter.title);
		}
	}

	for (let i = 0; i < data.length; i++) {
		const line = data[i];

		// Check if we're crossing into a new chapter
		const nextChapter = findNextChapter(
			sortedChapters,
			quoteTimeOffset,
			usedChapters,
		);

		if (nextChapter && line.offset >= nextChapter.startTime) {
			// Save current block before starting new chapter (if we have content)
			if (quote.trim() !== "") {
				transcriptBlocks.push({
					quote: quote.trim(),
					quoteTimeOffset,
					chapter: currentChapter,
				});
			}

			// Start new block at chapter's exact timestamp
			currentChapter = nextChapter.title;
			usedChapters.add(nextChapter.title);
			quote = line.text + " ";
			quoteTimeOffset = nextChapter.startTime;
			lineCountInBlock = 1;
			continue;
		}

		// Normal processing based on timestampMod
		if (i === 0) {
			quote = line.text + " ";
			lineCountInBlock = 1;
		} else if (lineCountInBlock >= timestampMod) {
			// Save current block
			transcriptBlocks.push({
				quote: quote.trim(),
				quoteTimeOffset,
				chapter: currentChapter,
			});

			// Start new block
			quote = line.text + " ";
			quoteTimeOffset = line.offset;
			lineCountInBlock = 1;
			currentChapter = undefined; // Chapter only appears once at its start
		} else {
			quote += line.text + " ";
			lineCountInBlock++;
		}
	}

	// Push final block if there's remaining content
	if (quote.trim() !== "") {
		transcriptBlocks.push({
			quote: quote.trim(),
			quoteTimeOffset,
			chapter: currentChapter,
		});
	}

	return transcriptBlocks;
};
