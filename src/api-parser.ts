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
const YOUTUBE_VIDEOID_REGEX = new RegExp(
	/<link\s+rel="canonical"\s+href="([^"]*)\">/,
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

	const videoIdMatch = htmlContent.match(YOUTUBE_VIDEOID_REGEX);
	let videoId = "";
	if (videoIdMatch) videoId = videoIdMatch[1].split("?v=")[1];

	const scripts = parsedBody.getElementsByTagName("script");
	const playerScript = scripts.find((script) =>
		script.textContent.includes("var ytInitialData = {"),
	);

	if (!playerScript) {
		throw new YoutubeTranscriptError(
			"Could not find ytInitialPlayerResponse",
		);
	}

	// Extract the JSON data
	const dataString =
		playerScript.textContent
			?.split("var ytInitialData = ")?.[1]
			?.split("};")?.[0] + "}";

	if (!dataString) {
		throw new YoutubeTranscriptError("Could not extract transcript info");
	}

	let data;
	try {
		data = JSON.parse(dataString.trim());
	} catch (err) {
		throw new YoutubeTranscriptError(
			"Failed to parse transcriot info JSON",
		);
	}

	const transcriptPanel = data?.engagementPanels?.find(
		(panel: any) =>
			panel?.engagementPanelSectionListRenderer?.content
				?.continuationItemRenderer?.continuationEndpoint
				?.getTranscriptEndpoint,
	);
	const params =
		transcriptPanel?.engagementPanelSectionListRenderer?.content
			?.continuationItemRenderer?.continuationEndpoint
			?.getTranscriptEndpoint?.params;

	// Create the API request body
	const requestBody = {
		context: {
			client: {
				clientName: "WEB",
				clientVersion: "2.20250610.04.00",
				hl: config?.lang || "en",
				gl: config?.country || "US",
			},
		},
		externalVideoId: videoId,
		params: params,
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
