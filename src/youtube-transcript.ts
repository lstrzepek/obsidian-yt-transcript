import { request, requestUrl } from "obsidian";
// import { parseTranscript, parseVideoPage } from "./caption-parser";
import { parseTranscript, parseVideoPage } from "./api-parser";
import type { TranscriptConfig, TranscriptResponse } from "./types";
import { YoutubeTranscriptError } from "./types";

export { YoutubeTranscriptError } from "./types";
export type {
	TranscriptConfig,
	TranscriptLine,
	TranscriptResponse,
} from "./types";

export class YoutubeTranscript {
	public static async getTranscript(
		url: string,
		config?: TranscriptConfig,
	): Promise<TranscriptResponse> {
		try {
			const videoPageBody = await request(url);
			const videoData = parseVideoPage(videoPageBody, config);

			let responseContent: string;
			if (videoData.transcriptRequest.body) {
				// Use requestUrl for POST requests with body
				const response = await requestUrl({
					url: videoData.transcriptRequest.url,
					method: "POST",
					headers: videoData.transcriptRequest.headers,
					body: videoData.transcriptRequest.body,
				});
				responseContent = response.text;
			} else {
				// Use simple request for GET requests
				responseContent = await request(
					videoData.transcriptRequest.url,
				);
			}

			const lines = parseTranscript(responseContent);

			return {
				title: videoData.title,
				lines,
			};
		} catch (err: any) {
			throw new YoutubeTranscriptError(err);
		}
	}
}
