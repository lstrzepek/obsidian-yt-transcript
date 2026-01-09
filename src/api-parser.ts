import type { TranscriptLine } from "./types";
import { YoutubeTranscriptError } from "./types";

const YOUTUBE_TITLE_REGEX = new RegExp(
	/<meta\s+name="title"\s+content="([^"]*)\">/,
);
const YOUTUBE_VIDEOID_REGEX = new RegExp(
	/<link\s+rel="canonical"\s+href="([^"]*)\">/,
);

/**
 * Caption track information from YouTube player response
 */
export interface CaptionTrack {
	baseUrl: string;
	name: string;
	languageCode: string;
	isTranslatable: boolean;
}

/**
 * Extract video title from YouTube page HTML
 */
export function extractVideoTitle(htmlContent: string): string {
	const titleMatch = htmlContent.match(YOUTUBE_TITLE_REGEX);
	return titleMatch ? titleMatch[1] : "";
}

/**
 * Extract video ID from YouTube page HTML
 */
export function extractVideoId(htmlContent: string): string | null {
	const videoIdMatch = htmlContent.match(YOUTUBE_VIDEOID_REGEX);
	if (videoIdMatch) {
		const urlParts = videoIdMatch[1].split("?v=");
		if (urlParts.length > 1) {
			return urlParts[1];
		}
	}

	// Try alternative patterns
	const altPatterns = [
		/\"videoId\"\s*:\s*\"([^\"]+)\"/,
		/watch\?v=([a-zA-Z0-9_-]{11})/,
		/embed\/([a-zA-Z0-9_-]{11})/,
		/youtu\.be\/([a-zA-Z0-9_-]{11})/,
	];

	for (const pattern of altPatterns) {
		const match = htmlContent.match(pattern);
		if (match) {
			return match[1];
		}
	}

	return null;
}

/**
 * Unescape URL that may contain unicode escapes like \u0026
 */
function unescapeUrl(url: string): string {
	if (!url) return url;
	// Handle unicode escapes like \u0026 -> &
	return url.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => 
		String.fromCharCode(parseInt(hex, 16))
	);
}

/**
 * Extract caption tracks from YouTube player API response
 */
export function getCaptionTracksFromPlayer(
	playerData: any,
	preferredLang?: string,
): CaptionTrack[] {
	const captionTracks: CaptionTrack[] = [];

	const captions = playerData?.captions?.playerCaptionsTracklistRenderer;
	if (!captions?.captionTracks) {
		return [];
	}

	for (const track of captions.captionTracks) {
		captionTracks.push({
			baseUrl: unescapeUrl(track.baseUrl),
			name: track.name?.simpleText || track.name?.runs?.[0]?.text || "",
			languageCode: track.languageCode,
			isTranslatable: track.isTranslatable || false,
		});
	}

	// Sort tracks: preferred language first, then by language code
	if (preferredLang) {
		captionTracks.sort((a, b) => {
			const aMatch = a.languageCode.toLowerCase().startsWith(preferredLang.toLowerCase());
			const bMatch = b.languageCode.toLowerCase().startsWith(preferredLang.toLowerCase());
			if (aMatch && !bMatch) return -1;
			if (!aMatch && bMatch) return 1;
			return 0;
		});
	}

	return captionTracks;
}

/**
 * Extract caption tracks directly from YouTube page HTML
 * This extracts from the embedded ytInitialPlayerResponse data
 */
export function getCaptionTracksFromPage(
	htmlContent: string,
	preferredLang?: string,
): CaptionTrack[] {
	// Try to find ytInitialPlayerResponse in the page
	const patterns = [
		/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
		/var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
	];

	for (const pattern of patterns) {
		const match = htmlContent.match(pattern);
		if (match) {
			try {
				// Find the end of the JSON object properly
				const jsonStr = match[1];
				// Try to parse - may need to find proper end
				let playerData;
				try {
					playerData = JSON.parse(jsonStr);
				} catch {
					// Try to find the proper end of the JSON
					const startIdx = htmlContent.indexOf(match[0]);
					const searchStart = htmlContent.indexOf("{", startIdx);
					let braceCount = 0;
					let endIdx = searchStart;
					
					for (let i = searchStart; i < htmlContent.length; i++) {
						if (htmlContent[i] === "{") braceCount++;
						if (htmlContent[i] === "}") braceCount--;
						if (braceCount === 0) {
							endIdx = i + 1;
							break;
						}
					}
					
					const properJson = htmlContent.substring(searchStart, endIdx);
					playerData = JSON.parse(properJson);
				}

				const tracks = getCaptionTracksFromPlayer(playerData, preferredLang);
				if (tracks.length > 0) {
					return tracks;
				}
			} catch (e) {
				// Continue to next pattern
			}
		}
	}

	// Also try to find captions in ytInitialData
	const dataPatterns = [
		/ytInitialData\s*=\s*(\{.+?\});/s,
		/var\s+ytInitialData\s*=\s*(\{.+?\});/s,
	];

	for (const pattern of dataPatterns) {
		const match = htmlContent.match(pattern);
		if (match) {
			try {
				const startIdx = htmlContent.indexOf(match[0]);
				const searchStart = htmlContent.indexOf("{", startIdx);
				let braceCount = 0;
				let endIdx = searchStart;
				
				for (let i = searchStart; i < htmlContent.length; i++) {
					if (htmlContent[i] === "{") braceCount++;
					if (htmlContent[i] === "}") braceCount--;
					if (braceCount === 0) {
						endIdx = i + 1;
						break;
					}
				}
				
				const properJson = htmlContent.substring(searchStart, endIdx);
				const data = JSON.parse(properJson);
				
				// Look for captions in the data structure
				const tracks = getCaptionTracksFromPlayer(data, preferredLang);
				if (tracks.length > 0) {
					return tracks;
				}
			} catch (e) {
				// Continue
			}
		}
	}

	return [];
}

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
		.replace(/&#x([a-fA-F0-9]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
		.replace(/\n/g, " ")
		.trim();
}

/**
 * Parse transcript XML from YouTube caption track URL
 * Supports both <text> and <p> tag formats
 */
export function parseTranscriptXml(xmlContent: string): TranscriptLine[] {
	const lines: TranscriptLine[] = [];

	// Try parsing <text> tag format (most common)
	// Use non-greedy matching for the content
	const textMatches = xmlContent.matchAll(
		/<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g,
	);

	for (const match of textMatches) {
		const startSeconds = parseFloat(match[1]);
		const durationSeconds = parseFloat(match[2]);
		const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ""));

		if (text) {
			lines.push({
				text,
				offset: Math.round(startSeconds * 1000),
				duration: Math.round(durationSeconds * 1000),
			});
		}
	}

	// If no <text> tags found, try <p> tag format (alternative format)
	if (lines.length === 0) {
		const pMatches = xmlContent.matchAll(
			/<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g,
		);

		for (const match of pMatches) {
			const offset = parseInt(match[1], 10);
			const duration = parseInt(match[2], 10);
			const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ""));

			if (text) {
				lines.push({
					text,
					offset,
					duration,
				});
			}
		}
	}

	return lines;
}

/**
 * @deprecated Legacy function - kept for backwards compatibility with tests
 * Parse transcript from old JSON API response format
 */
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
			if (!cue || !cue.snippet || !cue.startMs || !cue.endMs) {
				return {
					text: "",
					duration: 0,
					offset: 0,
				};
			}
			return {
				text: cue.snippet?.runs?.[0]?.text || "",
				duration: parseInt(cue.endMs) - parseInt(cue.startMs),
				offset: parseInt(cue.startMs),
			};
		});
	} catch (error) {
		throw new YoutubeTranscriptError(
			`Failed to parse API response: ${error}`,
		);
	}
}
