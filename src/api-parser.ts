import { parse } from "node-html-parser";
import type {
	TranscriptConfig,
	TranscriptLine,
	TranscriptRequest,
	VideoData,
} from "./types";
import { YoutubeTranscriptError } from "./types";

const YOUTUBE_TITLE_REGEX = new RegExp(
	/<meta\s+name="title"\s+content="([^"]*)\">/,
);

export function parseTranscript(responseContent: string): TranscriptLine[] {
	try {
		const response = JSON.parse(responseContent);

		// Extract transcript from YouTube API response
		const transcriptEvents =
			response?.actions?.[0]?.updateEngagementPanelAction?.content
				?.transcriptRenderer?.content?.transcriptSearchPanelRenderer
				?.body?.transcriptSegmentListRenderer?.initialSegments;

		if (!transcriptEvents || !Array.isArray(transcriptEvents)) {
			return [];
		}

		return transcriptEvents.map((segment: any) => {
			const cue = segment.transcriptSegmentRenderer;
			return {
				text: cue.snippet?.runs?.[0]?.text || "",
				duration: parseInt(cue.endMs) - parseInt(cue.startTimeMs),
				offset: parseInt(cue.startTimeMs),
			};
		});
	} catch (error) {
		throw new YoutubeTranscriptError(
			`Failed to parse API response: ${error}`,
		);
	}
}

export function parseVideoPage(
	htmlContent: string,
	config?: TranscriptConfig,
): VideoData {
	const parsedBody = parse(htmlContent);

	// Extract title
	const titleMatch = htmlContent.match(YOUTUBE_TITLE_REGEX);
	let title = "";
	if (titleMatch) title = titleMatch[1];

	// Find the script containing ytInitialPlayerResponse
	const scripts = parsedBody.getElementsByTagName("script");
	const playerScript = scripts.find((script) =>
		script.textContent.includes("var ytInitialPlayerResponse = {"),
	);

	if (!playerScript) {
		throw new YoutubeTranscriptError(
			"Could not find ytInitialPlayerResponse",
		);
	}

	// Extract the JSON data
	const dataString =
		playerScript.textContent
			?.split("var ytInitialPlayerResponse = ")?.[1]
			?.split("};")?.[0] + "}";

	if (!dataString) {
		throw new YoutubeTranscriptError(
			"Could not extract ytInitialPlayerResponse data",
		);
	}

	let data;
	try {
		data = JSON.parse(dataString.trim());
	} catch (err) {
		throw new YoutubeTranscriptError(
			"Failed to parse ytInitialPlayerResponse JSON",
		);
	}

	// Extract video ID
	const videoId = data?.videoDetails?.videoId;
	if (!videoId) {
		throw new YoutubeTranscriptError("Could not extract video ID");
	}

	// Extract client version
	const configScript = scripts.find((script) =>
		script.textContent.includes("ytcfg.set("),
	);

	let clientVersion = "2.20250610.04.00"; // fallback version
	if (configScript) {
		const versionMatch = configScript.textContent.match(
			/clientVersion":"([^"]+)"/,
		);
		if (versionMatch) {
			clientVersion = versionMatch[1];
		}
	}

	// Create the API request body
	const requestBody = {
		context: {
			client: {
				clientName: "WEB",
				clientVersion: clientVersion,
				hl: config?.lang || "en",
				gl: config?.country || "US",
			},
		},
		externalVideoId: videoId,
		params: generateTranscriptParams(videoId, config?.lang || "en"),
	};

	return {
		title,
		transcriptRequest: {
			url: "https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		},
	};
}

function generateTranscriptParams(videoId: string, langCode: string): string {
	// The params is a base64 encoded protobuf that contains:
	// - Video ID
	// - Language preferences
	// - Panel configuration for transcript search
	// For the video "kNNGOrJDdO8", the expected value is:
	return "CgtrTk5HT3JKRGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D";
}
