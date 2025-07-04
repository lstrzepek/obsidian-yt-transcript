import { parse } from "node-html-parser";
import * as protobuf from "protobufjs";
import type { TranscriptConfig, TranscriptLine, VideoData } from "./types";
import { YoutubeTranscriptError } from "./types";

const YOUTUBE_TITLE_REGEX = new RegExp(
	/<meta\s+name="title"\s+content="([^"]*)\">/,
);
const YOUTUBE_VIDEOID_REGEX = new RegExp(
	/<link\s+rel="canonical"\s+href="([^"]*)\">/,
);

function generateTranscriptParams(
	videoId: string,
	useAsrStyle: boolean,
	field6Value: number,
	lang: string = "en",
): string {
	const writer = protobuf.Writer.create();

	// Field 1: Video ID (string)
	writer.uint32(10).string(videoId);

	// Field 2: Language/context data (string) - base64 with URL-encoded = sign
	let contextData;
	if (useAsrStyle) {
		// For videos that use asr style: CgNhc3ISAmVuGgA%3D
		contextData = "CgNhc3ISAmVuGgA%3D";
	} else {
		// For videos that don't use asr style: CgASAmVuGgA%3D
		contextData = "CgASAmVuGgA%3D";
	}
	writer.uint32(18).string(contextData);

	// Field 3: Number 1 (varint)
	writer.uint32(24).uint32(1);

	// Field 5: Panel identifier (string)
	writer
		.uint32(42)
		.string("engagement-panel-searchable-transcript-search-panel");

	// Field 6: Specific value based on video characteristics
	writer.uint32(48).uint32(field6Value);

	// Field 7: Number 1 (varint)
	writer.uint32(56).uint32(1);

	// Field 8: Number 1 (varint)
	writer.uint32(64).uint32(1);

	const buffer = writer.finish();
	return Buffer.from(buffer).toString("base64").replace(/=/g, "%3D");
}

export function generateAlternativeTranscriptParams(
	videoId: string,
	lang: string = "en",
): string[] {
	// Generate both possible parameter combinations to try
	const variations = [
		// Most common: ASR style with field6 = 1
		{ useAsrStyle: true, field6Value: 1 },
		// Alternative 1: No ASR style with field6 = 0
		{ useAsrStyle: false, field6Value: 0 },
		// Alternative 2: ASR style with field6 = 0
		{ useAsrStyle: true, field6Value: 0 },
		// Alternative 3: No ASR style with field6 = 1
		{ useAsrStyle: false, field6Value: 1 },
	];

	return variations.map((variant) =>
		generateTranscriptParams(
			videoId,
			variant.useAsrStyle,
			variant.field6Value,
			lang,
		),
	);
}

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

export function extractParamsFromPage(htmlContent: string): string | null {
	console.log("🔍 DEBUG: Looking for ytInitialData script tag...");
	console.log(
		"📊 DEBUG: HTML content length:",
		htmlContent.length,
		"characters",
	);

	// First, find the script tag containing "var ytInitialData ="
	let ytInitialDataMatch = htmlContent.match(
		/var ytInitialData\s*=\s*({.+?});/s,
	);

	if (!ytInitialDataMatch) {
		console.log(
			"❌ DEBUG: No ytInitialData script found with 'var' pattern",
		);
		// Try alternative patterns
		const altPatterns = [
			/window\.ytInitialData\s*=\s*({.+?});/s,
			/ytInitialData\s*=\s*({.+?});/s,
			/"ytInitialData"\s*:\s*({.+?})/s,
		];

		for (let i = 0; i < altPatterns.length; i++) {
			const match = htmlContent.match(altPatterns[i]);
			if (match) {
				console.log(
					`✅ DEBUG: Found ytInitialData using alternative pattern ${i + 1}`,
				);
				ytInitialDataMatch = match;
				break;
			}
		}

		if (!ytInitialDataMatch) {
			return null;
		}
	} else {
		console.log("✅ DEBUG: Found ytInitialData script with 'var' pattern");
	}

	try {
		// Parse the JSON data
		const ytInitialDataString = ytInitialDataMatch[1];
		console.log(
			"🔧 DEBUG: Parsing ytInitialData JSON (length:",
			ytInitialDataString.length,
			"chars)",
		);

		const ytInitialData = JSON.parse(ytInitialDataString);

		// Recursively search for getTranscriptEndpoint in the object
		function findGetTranscriptEndpoint(
			obj: any,
			path = "",
			depth = 0,
		): string | null {
			if (!obj || typeof obj !== "object") {
				return null;
			}

			// Log progress for deep searches
			if (depth === 0) {
				console.log(
					"🔍 DEBUG: Starting recursive search for getTranscriptEndpoint...",
				);
			}

			// Check if current object has getTranscriptEndpoint
			if (obj.getTranscriptEndpoint && obj.getTranscriptEndpoint.params) {
				console.log(
					`✅ DEBUG: Found getTranscriptEndpoint.params at path: ${path} (depth: ${depth})`,
				);
				console.log(
					`📏 DEBUG: Params length: ${obj.getTranscriptEndpoint.params.length} characters`,
				);
				return obj.getTranscriptEndpoint.params;
			}

			// Look for any key containing "transcript" for debugging
			if (depth < 3) {
				// Only log for shallow depths to avoid spam
				for (const key of Object.keys(obj)) {
					if (
						key.toLowerCase().includes("transcript") ||
						key.toLowerCase().includes("engagement")
					) {
						console.log(
							`🔍 DEBUG: Found transcript/engagement-related key: "${key}" at path: ${path} (depth: ${depth})`,
						);
					}
				}
			}

			// Recursively search in all properties
			for (const [key, value] of Object.entries(obj)) {
				if (value && typeof value === "object") {
					const result = findGetTranscriptEndpoint(
						value,
						path ? `${path}.${key}` : key,
						depth + 1,
					);
					if (result) {
						return result;
					}
				}
			}

			return null;
		}

		const params = findGetTranscriptEndpoint(ytInitialData);

		if (params && typeof params === "string" && params.length > 50) {
			console.log(
				`✅ DEBUG: Found valid getTranscriptEndpoint params (${params.length} chars):`,
				params.substring(0, 50) + "...",
			);
			return params;
		} else if (params) {
			console.log(
				`⚠️ DEBUG: Found getTranscriptEndpoint params but too short (${params.length} chars):`,
				params,
			);
		} else {
			console.log(
				"❌ DEBUG: No getTranscriptEndpoint.params found in ytInitialData",
			);
		}
	} catch (error) {
		console.log("❌ DEBUG: Failed to parse ytInitialData JSON:", error);
	}

	return null;
}

function extractVisitorData(htmlContent: string): string | null {
	// Try to extract visitorData from the page
	const visitorDataMatch =
		htmlContent.match(/"visitorData"\s*:\s*"([^"]+)"/) ||
		htmlContent.match(/visitorData['"]\s*:\s*['"]([^"']+)['"]/);

	if (visitorDataMatch) {
		console.log(
			"✅ DEBUG: Found visitorData:",
			visitorDataMatch[1].substring(0, 20) + "...",
		);
		return visitorDataMatch[1];
	}

	console.log("⚠️ DEBUG: No visitorData found, using fallback");
	return "Cgs5LXVQa0I1YnhHOCjZ7ZDDBjInCgJQTBIhEh0SGwsMDg8QERITFBUWFxgZGhscHR4fICEiIyQlJiAS";
}

export function parseVideoPageWithFallbacks(
	htmlContent: string,
	config?: TranscriptConfig,
): {
	title: string;
	transcriptRequests: Array<{
		url: string;
		headers: Record<string, string>;
		body: string;
	}>;
} {
	const parsedBody = parse(htmlContent);

	// Extract title
	const titleMatch = htmlContent.match(YOUTUBE_TITLE_REGEX);
	let title = "";
	if (titleMatch) title = titleMatch[1];

	const videoIdMatch = htmlContent.match(YOUTUBE_VIDEOID_REGEX);
	let videoId = "";
	if (videoIdMatch) videoId = videoIdMatch[1].split("?v=")[1];

	// Extract visitorData from the page
	const visitorData = extractVisitorData(htmlContent);

	// Try to extract params from the page first
	const pageParams = extractParamsFromPage(htmlContent);
	console.log(
		"🔍 DEBUG: Params found on video page:",
		pageParams || "NOT FOUND",
	);

	if (pageParams) {
		console.log(
			"📏 DEBUG: Page params length:",
			pageParams.length,
			"characters",
		);
		console.log(
			"🔍 DEBUG: Page params preview:",
			pageParams.substring(0, 100) + "...",
		);
	}

	// Generate all possible parameter combinations
	const generatedParams = generateAlternativeTranscriptParams(
		videoId,
		config?.lang || "en",
	);
	console.log(
		"🔧 DEBUG: Generated",
		generatedParams.length,
		"params variations for video ID:",
		videoId,
	);
	generatedParams.forEach((params, index) => {
		console.log(
			`  Generated variation ${index + 1} (${params.length} chars):`,
			params.substring(0, 50) + "...",
		);
	});

	// Compare page params with generated ones
	if (pageParams) {
		let foundMatch = false;
		generatedParams.forEach((generatedParam, index) => {
			if (generatedParam === pageParams) {
				console.log(
					`🎯 MATCH! Page params identical to generated variation ${index + 1}`,
				);
				foundMatch = true;
			}
		});

		if (!foundMatch) {
			console.log(
				"🔄 DEBUG: Page params are DIFFERENT from all generated variations - this could be video-specific!",
			);
		}
	}

	// If we found params on the page, try those first, then fall back to generated ones
	const allParams = pageParams
		? [pageParams, ...generatedParams]
		: generatedParams;

	if (pageParams) {
		console.log(
			"✅ DEBUG: Will try page params FIRST (attempt 1), then",
			generatedParams.length,
			"generated variations",
		);
	} else {
		console.log(
			"⚠️ DEBUG: No valid page params found, will try",
			generatedParams.length,
			"generated variations only",
		);
	}

	const transcriptRequests = allParams.map((params) => {
		const requestBody = {
			context: {
				client: {
					clientName: "WEB",
					clientVersion: "2.20250701.01.00",
					hl: config?.lang || "en",
					gl: config?.country || "EN",
					userAgent:
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15,gzip(gfe)",
					platform: "DESKTOP",
					clientFormFactor: "UNKNOWN_FORM_FACTOR",
					visitorData: visitorData,
					deviceMake: "Apple",
					deviceModel: "",
					osName: "Macintosh",
					osVersion: "10_15_7",
					browserName: "Safari",
					browserVersion: "18.5",
					acceptHeader:
						"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
					timeZone: "Europe/Warsaw",
					utcOffsetMinutes: 120,
					screenWidthPoints: 2520,
					screenHeightPoints: 847,
					screenPixelDensity: 2,
					screenDensityFloat: 2,
					mainAppWebInfo: {
						graftUrl: `https://www.youtube.com/watch?v=${videoId}`,
						webDisplayMode: "WEB_DISPLAY_MODE_BROWSER",
						isWebNativeShareAvailable: true,
					},
				},
				user: {
					lockedSafetyMode: false,
				},
				request: {
					useSsl: true,
					internalExperimentFlags: [],
					consistencyTokenJars: [],
				},
				clickTracking: {
					clickTrackingParams:
						"CBUQ040EGAgiEwi43tyvspyOAxUxa3oFHaiXLzM=",
				},
				adSignalsInfo: {
					params: [
						{ key: "dt", value: Date.now().toString() },
						{ key: "flash", value: "0" },
						{ key: "frm", value: "0" },
						{ key: "u_tz", value: "120" },
						{ key: "u_his", value: "2" },
						{ key: "u_h", value: "847" },
						{ key: "u_w", value: "2520" },
						{ key: "u_ah", value: "847" },
						{ key: "u_aw", value: "2520" },
						{ key: "u_cd", value: "24" },
						{ key: "bc", value: "31" },
						{ key: "bih", value: "847" },
						{ key: "biw", value: "2504" },
						{
							key: "brdim",
							value: "0,0,0,0,2520,0,2520,847,2520,847",
						},
						{ key: "vis", value: "1" },
						{ key: "wgl", value: "true" },
						{ key: "ca_type", value: "image" },
					],
				},
			},
			externalVideoId: videoId,
			params: params,
		};

		return {
			url: "https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false",
			headers: {
				"Content-Type": "application/json",
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
				Accept: "*/*",
				"Accept-Language": "en-US,en;q=0.9",
				"X-Youtube-Client-Name": "1",
				"X-Youtube-Client-Version": "2.20250701.01.00",
				"X-Goog-EOM-Visitor-Id":
					visitorData ||
					"Cgs5LXVQa0I1YnhHOCjZ7ZDDBjInCgJQTBIhEh0SGwsMDg8QERITFBUWFxgZGhscHR4fICEiIyQlJiAS",
				"X-Youtube-Bootstrap-Logged-In": "false",
				"X-Origin": "https://www.youtube.com",
				Origin: "https://www.youtube.com",
				Referer: `https://www.youtube.com/watch?v=${videoId}`,
			},
			body: JSON.stringify(requestBody),
		};
	});

	return {
		title,
		transcriptRequests,
	};
}
