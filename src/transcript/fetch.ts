import { parseTranscriptXml } from "./parse-xml";
import type { HttpClient } from "./http";
import type { TranscriptConfig, TranscriptResponse } from "./types";
import { YouTubeTranscriptError } from "./types";

export { YouTubeTranscriptError } from "./types";
export type {
	TranscriptConfig,
	TranscriptLine,
	TranscriptResponse,
} from "./types";

// YouTube's public InnerTube API key.
const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_PLAYER_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`;

// IOS client — ANDROID stopped returning captions in early 2026.
// IOS returns caption track URLs that work without PO tokens.
const INNERTUBE_CONTEXT = {
	client: {
		clientName: "IOS",
		clientVersion: "20.10.38",
		hl: "en",
		gl: "US",
	},
};

const IOS_USER_AGENT =
	"com.google.ios.youtube/20.10.38 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)";

export async function fetchTranscript(
	url: string,
	http: HttpClient,
	config?: TranscriptConfig,
): Promise<TranscriptResponse> {
	try {
		const videoId = extractVideoIdFromUrl(url);
		if (!videoId) {
			throw new YouTubeTranscriptError(
				new Error("Invalid YouTube URL - could not extract video ID"),
			);
		}

		const playerData = await fetchPlayerData(videoId, http, config);
		const title = playerData.videoDetails?.title || "Unknown";

		const captionsData =
			playerData.captions?.playerCaptionsTracklistRenderer;
		if (!captionsData || !captionsData.captionTracks) {
			throw new YouTubeTranscriptError(
				new Error("No captions available for this video"),
			);
		}

		const langCode = config?.lang || "en";
		const captionTrack = findCaptionTrack(
			captionsData.captionTracks,
			langCode,
		);
		if (!captionTrack) {
			const availableLangs = captionsData.captionTracks
				.map((t: any) => t.languageCode)
				.join(", ");
			throw new YouTubeTranscriptError(
				new Error(
					`No transcript found for language '${langCode}'. Available: ${availableLangs}`,
				),
			);
		}

		const lines = await fetchTranscriptFromUrl(captionTrack.baseUrl, http);

		return {
			title: decodeHtml(title),
			lines,
		};
	} catch (err: any) {
		if (err instanceof YouTubeTranscriptError) {
			throw err;
		}
		throw new YouTubeTranscriptError(err);
	}
}

function extractVideoIdFromUrl(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
		/^([a-zA-Z0-9_-]{11})$/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) {
			return match[1];
		}
	}
	return null;
}

async function fetchPlayerData(
	videoId: string,
	http: HttpClient,
	config?: TranscriptConfig,
): Promise<any> {
	const context = {
		...INNERTUBE_CONTEXT,
		client: {
			...INNERTUBE_CONTEXT.client,
			hl: config?.lang || "en",
			gl: config?.country || "US",
		},
	};

	const body = JSON.stringify({ context, videoId });

	const responseText = await http.request({
		url: INNERTUBE_PLAYER_URL,
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"User-Agent": IOS_USER_AGENT,
		},
		body,
	});

	const data = JSON.parse(responseText);

	const playabilityStatus = data.playabilityStatus;
	if (playabilityStatus) {
		if (playabilityStatus.status === "ERROR") {
			throw new Error(playabilityStatus.reason || "Video unavailable");
		}
		if (playabilityStatus.status === "LOGIN_REQUIRED") {
			throw new Error("This video requires login to view");
		}
		if (playabilityStatus.status === "UNPLAYABLE") {
			throw new Error(playabilityStatus.reason || "Video is unplayable");
		}
	}

	return data;
}

function findCaptionTrack(captionTracks: any[], langCode: string): any {
	let track = captionTracks.find((t: any) => t.languageCode === langCode);
	if (track) return track;

	track = captionTracks.find((t: any) =>
		t.languageCode.startsWith(langCode + "-"),
	);
	if (track) return track;

	track = captionTracks.find((t: any) =>
		langCode.startsWith(t.languageCode + "-"),
	);
	if (track) return track;

	if (captionTracks.length > 0) {
		return captionTracks[0];
	}

	return null;
}

async function fetchTranscriptFromUrl(
	transcriptUrl: string,
	http: HttpClient,
): Promise<any[]> {
	const responseText = await http.request({
		url: transcriptUrl,
		method: "GET",
		headers: {
			"Accept-Language": "en-US,en;q=0.9",
		},
	});

	if (responseText.length === 0) {
		throw new Error("Received empty transcript response");
	}

	return parseTranscriptXml(responseText);
}

function decodeHtml(text: string): string {
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
