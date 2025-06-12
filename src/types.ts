export class YoutubeTranscriptError extends Error {
	constructor(err: unknown) {
		if (!(err instanceof Error)) {
			super("");
			return;
		}

		if (err.message.includes("ERR_INVALID_URL")) {
			super("Invalid YouTube URL");
		} else {
			super(err.message);
		}
	}
}

export interface TranscriptConfig {
	lang?: string;
	country?: string;
}

export interface TranscriptResponse {
	title: string;
	lines: TranscriptLine[];
}

export interface TranscriptLine {
	text: string;
	duration: number;
	offset: number;
}

export interface TranscriptRequest {
	url: string;
	headers?: Record<string, string>;
	body?: string;
}

export interface VideoData {
	title: string;
	transcriptRequest: TranscriptRequest;
}

export interface TranscriptBlock {
	quote: string;
	quoteTimeOffset: number;
}
