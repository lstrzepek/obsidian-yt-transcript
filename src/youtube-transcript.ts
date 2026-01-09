import { requestUrl } from "obsidian";
import { parseTranscriptXml } from "./api-parser";
import type { TranscriptConfig, TranscriptResponse } from "./types";
import { YoutubeTranscriptError } from "./types";

export { YoutubeTranscriptError } from "./types";
export type {
	TranscriptConfig,
	TranscriptLine,
	TranscriptResponse,
} from "./types";

/**
 * YouTube transcript fetcher using InnerTube Player API.
 * This implementation is based on the approach used by youtube-transcript-api (Python)
 * and obsidian-yt-video-summarizer.
 */
export class YoutubeTranscript {
	// YouTube's public InnerTube API key
	private static readonly INNERTUBE_API_KEY =
		"AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
	private static readonly INNERTUBE_PLAYER_URL = `https://www.youtube.com/youtubei/v1/player?key=${YoutubeTranscript.INNERTUBE_API_KEY}`;

	// Use ANDROID client like youtube-transcript-api does - it's less restricted
	private static readonly INNERTUBE_CONTEXT = {
		client: {
			clientName: "ANDROID",
			clientVersion: "19.09.37",
			androidSdkVersion: 30,
			hl: "en",
			gl: "US",
		},
	};

	public static async getTranscript(
		url: string,
		config?: TranscriptConfig,
	): Promise<TranscriptResponse> {
		try {
			// Extract video ID from URL
			const videoId = this.extractVideoIdFromUrl(url);
			if (!videoId) {
				throw new YoutubeTranscriptError(
					new Error(
						"Invalid YouTube URL - could not extract video ID",
					),
				);
			}

			console.log(`🎬 Fetching transcript for video: ${videoId}`);

			// Fetch player data to get caption tracks
			const playerData = await this.fetchPlayerData(videoId, config);

			// Extract video metadata
			const title = playerData.videoDetails?.title || "Unknown";

			// Get caption tracks
			const captionsData =
				playerData.captions?.playerCaptionsTracklistRenderer;
			if (!captionsData || !captionsData.captionTracks) {
				throw new YoutubeTranscriptError(
					new Error("No captions available for this video"),
				);
			}

			console.log(
				`📝 Found ${captionsData.captionTracks.length} caption track(s)`,
			);

			// Find the best matching caption track
			const langCode = config?.lang || "en";
			const captionTrack = this.findCaptionTrack(
				captionsData.captionTracks,
				langCode,
			);
			if (!captionTrack) {
				const availableLangs = captionsData.captionTracks
					.map((t: any) => t.languageCode)
					.join(", ");
				throw new YoutubeTranscriptError(
					new Error(
						`No transcript found for language '${langCode}'. Available: ${availableLangs}`,
					),
				);
			}

			const trackName =
				captionTrack.name?.runs?.[0]?.text ||
				captionTrack.name?.simpleText ||
				captionTrack.languageCode;
			console.log(
				`🔄 Using caption track: ${trackName} (${captionTrack.languageCode})`,
			);

			// Fetch the actual transcript from the caption URL
			const transcriptUrl = captionTrack.baseUrl;
			console.log(
				`📥 Fetching transcript from: ${transcriptUrl.substring(0, 80)}...`,
			);

			const lines = await this.fetchTranscriptFromUrl(transcriptUrl);
			console.log(
				`✅ Successfully fetched ${lines.length} transcript lines`,
			);

			return {
				title: this.decodeHTML(title),
				lines,
			};
		} catch (err: any) {
			if (err instanceof YoutubeTranscriptError) {
				throw err;
			}
			throw new YoutubeTranscriptError(err);
		}
	}

	/**
	 * Extract video ID from various YouTube URL formats
	 */
	private static extractVideoIdFromUrl(url: string): string | null {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
			/^([a-zA-Z0-9_-]{11})$/, // Just the video ID
		];

		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match) {
				return match[1];
			}
		}
		return null;
	}

	/**
	 * Fetches player data from YouTube's InnerTube API using ANDROID client
	 */
	private static async fetchPlayerData(
		videoId: string,
		config?: TranscriptConfig,
	): Promise<any> {
		const context = {
			...YoutubeTranscript.INNERTUBE_CONTEXT,
			client: {
				...YoutubeTranscript.INNERTUBE_CONTEXT.client,
				hl: config?.lang || "en",
				gl: config?.country || "US",
			},
		};

		const requestBody = {
			context: context,
			videoId: videoId,
		};

		console.log(`🔄 Calling InnerTube Player API with ANDROID client...`);

		const response = await requestUrl({
			url: YoutubeTranscript.INNERTUBE_PLAYER_URL,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent":
					"com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
			},
			body: JSON.stringify(requestBody),
		});

		const data = JSON.parse(response.text);

		// Check playability status
		const playabilityStatus = data.playabilityStatus;
		if (playabilityStatus) {
			console.log(`📊 Playability status: ${playabilityStatus.status}`);

			if (playabilityStatus.status === "ERROR") {
				throw new Error(
					playabilityStatus.reason || "Video unavailable",
				);
			}
			if (playabilityStatus.status === "LOGIN_REQUIRED") {
				throw new Error("This video requires login to view");
			}
			if (playabilityStatus.status === "UNPLAYABLE") {
				throw new Error(
					playabilityStatus.reason || "Video is unplayable",
				);
			}
		}

		return data;
	}

	/**
	 * Finds the best matching caption track for the requested language
	 */
	private static findCaptionTrack(
		captionTracks: any[],
		langCode: string,
	): any {
		// First try exact match
		let track = captionTracks.find((t: any) => t.languageCode === langCode);
		if (track) return track;

		// Try matching language prefix (e.g., 'en' matches 'en-US')
		track = captionTracks.find((t: any) =>
			t.languageCode.startsWith(langCode + "-"),
		);
		if (track) return track;

		// Try finding track where requested lang is a prefix (e.g., 'en-US' when looking for 'en')
		track = captionTracks.find((t: any) =>
			langCode.startsWith(t.languageCode + "-"),
		);
		if (track) return track;

		// Fall back to first available track
		if (captionTracks.length > 0) {
			console.log(
				`⚠️ Language '${langCode}' not found, falling back to '${captionTracks[0].languageCode}'`,
			);
			return captionTracks[0];
		}

		return null;
	}

	/**
	 * Fetches transcript XML from the caption track URL
	 */
	private static async fetchTranscriptFromUrl(
		transcriptUrl: string,
	): Promise<any[]> {
		const response = await requestUrl({
			url: transcriptUrl,
			method: "GET",
			headers: {
				"Accept-Language": "en-US,en;q=0.9",
			},
		});

		console.log(
			`📄 Transcript response length: ${response.text.length} bytes`,
		);

		if (response.text.length === 0) {
			throw new Error("Received empty transcript response");
		}

		return parseTranscriptXml(response.text);
	}

	/**
	 * Decodes HTML entities in a text string
	 */
	private static decodeHTML(text: string): string {
		return text
			.replace(/&#39;/g, "'")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&#(\d+);/g, (_, code) =>
				String.fromCharCode(parseInt(code, 10)),
			)
			.replace(/\\n/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}
}
