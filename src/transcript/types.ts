export interface TranscriptResponse {
	title: string;
	lines: TranscriptLine[];
}

export interface TranscriptLine {
	text: string;
	duration: number;
	offset: number;
}

export interface TranscriptBlock {
	quote: string;
	quoteTimeOffset: number;
}
