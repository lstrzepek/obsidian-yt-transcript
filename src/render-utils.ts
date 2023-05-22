import { TranscriptResponse } from "youtube-transcript";
import { TranscriptBlock } from "./types";

/**
 * Highlights matched text in the div
 * @param div - the div that we want to highlight
 * @param searchValue - the value that will be highlight
 */
export const highlightText = (div: HTMLElement, searchValue: string) => {
	const content = div.innerHTML;
	const highlightedContent = content.replace(
		new RegExp(searchValue, "gi"),
		'<span class="yt-transcript__highlight">$&</span>'
	);
	div.innerHTML = highlightedContent;
};

/**
 * Gets an array of transcript render blocks
 * @param data - the transcript data
 * @param timestampMod - the number of seconds between each timestamp
 */
export const getTranscriptBlocks = (
	data: TranscriptResponse[],
	timestampMod: number
) => {
	const transcriptBlocks: TranscriptBlock[] = [];

	//Convert data into blocks
	var quote = "";
	var quoteTimeOffset = 0;
	data.forEach((line, i) => {
		if (i === 0) {
			quoteTimeOffset = line.offset;
			quote += line.text + " ";
			return;
		}
		if (i % timestampMod == 0) {
			transcriptBlocks.push({
				quote,
				quoteTimeOffset,
			});

			//Clear the data
			quote = "";
			quoteTimeOffset = line.offset;
		}
		quote += line.text + " ";
	});

	if (quote !== "") {
		transcriptBlocks.push({
			quote,
			quoteTimeOffset,
		});
	}
	return transcriptBlocks;
};
