import { request, requestUrl } from "obsidian";
import { parseTranscript, parseVideoPageWithFallbacks } from "./api-parser";
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
			const videoData = parseVideoPageWithFallbacks(videoPageBody, config);

			console.log(`🚀 DEBUG: Starting transcript fetch with ${videoData.transcriptRequests.length} different parameter combinations`);

			// Try each parameter combination until one succeeds
			for (let i = 0; i < videoData.transcriptRequests.length; i++) {
				const transcriptRequest = videoData.transcriptRequests[i];
				
				// Extract and show params info
				let paramsInfo = "UNKNOWN";
				let paramsSource = "UNKNOWN";
				try {
					const requestBodyObj = JSON.parse(transcriptRequest.body);
					const currentParams = requestBodyObj.params;
					if (i === 0 && videoData.title) {
						// First attempt - check if this might be page params
						paramsSource = currentParams && currentParams.length > 50 ? "PAGE" : "GENERATED";
					} else {
						paramsSource = "GENERATED";
					}
					paramsInfo = `${currentParams.substring(0, 30)}... (${currentParams.length} chars)`;
				} catch (parseError) {
					paramsInfo = "PARSE_ERROR";
				}
				
				try {
					console.log(`🎯 Attempt ${i + 1}/${videoData.transcriptRequests.length}: Trying ${paramsSource} params: ${paramsInfo}`);
					
					const response = await requestUrl({
						url: transcriptRequest.url,
						method: "POST",
						headers: transcriptRequest.headers,
						body: transcriptRequest.body,
					});
					
					const lines = parseTranscript(response.text);
					
					// If we got valid transcript lines, return success
					if (lines && lines.length > 0) {
						console.log(`✅ SUCCESS on attempt ${i + 1}: Found ${lines.length} transcript lines using ${paramsSource} params!`);
						return {
							title: videoData.title,
							lines,
						};
					} else {
						console.log(`❌ Attempt ${i + 1} failed: No transcript lines returned (empty response)`);
					}
				} catch (requestError: any) {
					console.log(`❌ Attempt ${i + 1} failed: ${requestError.message}`);
					// Continue to next attempt unless this was the last one
					if (i === videoData.transcriptRequests.length - 1) {
						throw requestError;
					}
				}
			}

			throw new YoutubeTranscriptError("All parameter combinations failed to fetch transcript");
		} catch (err: any) {
			throw new YoutubeTranscriptError(err);
		}
	}
}
