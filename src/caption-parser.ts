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
	const resXML = parse(responseContent);
	const chunks = resXML.getElementsByTagName("text");

	return chunks.map((cue: any) => ({
		text: cue.textContent
			.replace(/&#39;/g, "'")
			.replace(/&amp;/g, "&")
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">"),
		duration: parseFloat(cue.attributes.dur) * 1000,
		offset: parseFloat(cue.attributes.start) * 1000,
	}));
}

export function parseVideoPage(
	htmlContent: string,
	config?: TranscriptConfig,
): VideoData {
	const langCode = config?.lang ?? "en";
	const parsedBody = parse(htmlContent);

	const titleMatch = htmlContent.match(YOUTUBE_TITLE_REGEX);
	let title = "";
	if (titleMatch) title = titleMatch[1];

	const scripts = parsedBody.getElementsByTagName("script");
	const playerScript = scripts.find((script) =>
		script.textContent.includes("var ytInitialPlayerResponse = {"),
	);

	if (!playerScript) {
		throw new YoutubeTranscriptError(
			"Could not find ytInitialPlayerResponse",
		);
	}

	const dataString =
		playerScript.textContent
			?.split("var ytInitialPlayerResponse = ")?.[1] //get the start of the object {....
			?.split("};")?.[0] + "}"; // chunk off any code after object closure. // add back that curly brace we just cut.

	if (!dataString) {
		throw new YoutubeTranscriptError(
			"Could not extract ytInitialPlayerResponse data",
		);
	}

	const data = JSON.parse(dataString.trim());
	const availableCaptions =
		data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
	// If languageCode was specified then search for it's code, otherwise get the first.
	let captionTrack = availableCaptions?.[0];
	if (langCode)
		captionTrack =
			availableCaptions.find((track: any) =>
				track.languageCode.includes(langCode),
			) ?? availableCaptions?.[0];

	if (!captionTrack?.baseUrl) {
		throw new YoutubeTranscriptError("No caption track found");
	}

	const captionsUrl = captionTrack.baseUrl.startsWith("https://")
		? captionTrack.baseUrl
		: "https://www.youtube.com" + captionTrack.baseUrl;

	return {
		title,
		transcriptRequest: {
			url: captionsUrl,
		},
	};
}
