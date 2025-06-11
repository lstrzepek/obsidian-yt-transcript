import { request } from "obsidian";
import { parseVideoPage, parseTranscript } from "./caption-parser";
import type { TranscriptConfig, TranscriptResponse } from "./types";
import { YoutubeTranscriptError } from "./types";

export { YoutubeTranscriptError } from "./types";
export type { TranscriptConfig, TranscriptResponse, TranscriptLine } from "./types";


export class YoutubeTranscript {
	public static async getTranscript(
		url: string,
		config?: TranscriptConfig,
	): Promise<TranscriptResponse> {
		try {
			const videoPageBody = await request(url);
			const videoData = parseVideoPage(videoPageBody, config);
			const responseContent = await request(videoData.transcriptRequest.url);
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
