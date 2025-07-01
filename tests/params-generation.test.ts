import { generateAlternativeTranscriptParams } from "../src/api-parser";
import { parse } from "node-html-parser";
import * as fs from "fs";
import * as path from "path";

describe("Transcript Params Generation", () => {
	interface TestCase {
		htmlFile: string;
		videoId: string;
		expectedParams: string;
		description: string;
	}

	const testCases: TestCase[] = [
		{
			htmlFile: "exampleYtVideo.html",
			videoId: "kNNGOrJDdO8",
			expectedParams: "CgtrTk5HT3JKRGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D",
			description: "English auto-generated captions"
		},
		{
			htmlFile: "exampleVideo2.html",
			videoId: "rOSZOCoqOo8",
			expectedParams: "CgtyT1NaT0NvcU9vOBIOQ2dBU0FtVnVHZ0ElM0QYASozZW5nYWdlbWVudC1wYW5lbC1zZWFyY2hhYmxlLXRyYW5zY3JpcHQtc2VhcmNoLXBhbmVsMAA4AUAB",
			description: "Mixed manual and auto-generated captions"
		},
		{
			htmlFile: "exampleVideo3.html",
			videoId: "sLgHqZSe2o0",
			expectedParams: "CgtzTGdIcVpTZTJvMBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D",
			description: "Non-English auto-generated captions only"
		}
	];

	function extractParamsFromHtml(htmlContent: string): string | null {
		try {
			const parsedBody = parse(htmlContent);
			const scripts = parsedBody.getElementsByTagName("script");
			
			// Look for ytInitialData first (original implementation)
			let playerScript = scripts.find((script) =>
				script.textContent.includes("var ytInitialData = {"),
			);

			if (playerScript) {
				const dataString = playerScript.textContent
					?.split("var ytInitialData = ")?.[1]
					?.split("};")?.[0] + "}";

				if (dataString) {
					const data = JSON.parse(dataString.trim());
					const transcriptPanel = data?.engagementPanels?.find(
						(panel: any) =>
							panel?.engagementPanelSectionListRenderer?.content
								?.continuationItemRenderer?.continuationEndpoint
								?.getTranscriptEndpoint,
					);
					const params = transcriptPanel?.engagementPanelSectionListRenderer?.content
						?.continuationItemRenderer?.continuationEndpoint
						?.getTranscriptEndpoint?.params;
					
					if (params) return params;
				}
			}

			// Look for ytInitialPlayerResponse as fallback
			playerScript = scripts.find((script) =>
				script.textContent.includes("var ytInitialPlayerResponse = {"),
			);

			if (playerScript) {
				const dataString = playerScript.textContent
					?.split("var ytInitialPlayerResponse = ")?.[1]
					?.split("};")?.[0] + "}";

				if (dataString) {
					const data = JSON.parse(dataString.trim());
					// Check if there are any params in the player response
					// This might not contain the engagement panel data we need
					return null;
				}
			}

			return null;
		} catch (error) {
			console.error("Error extracting params from HTML:", error);
			return null;
		}
	}

	function extractVideoIdFromHtml(htmlContent: string): string | null {
		const YOUTUBE_VIDEOID_REGEX = new RegExp(
			/<link\s+rel="canonical"\s+href="([^"]*)\">/,
		);
		const videoIdMatch = htmlContent.match(YOUTUBE_VIDEOID_REGEX);
		if (videoIdMatch) {
			return videoIdMatch[1].split("?v=")[1];
		}
		return null;
	}

	testCases.forEach(({ htmlFile, videoId, expectedParams, description }) => {
		describe(`${videoId} (${description})`, () => {
			let htmlContent: string;

			beforeAll(() => {
				const htmlPath = path.join(__dirname, htmlFile);
				htmlContent = fs.readFileSync(htmlPath, "utf8");
			});

			it("should extract correct video ID from HTML", () => {
				const extractedVideoId = extractVideoIdFromHtml(htmlContent);
				expect(extractedVideoId).toBe(videoId);
			});

			it("should generate params that match expected value", () => {
				const generatedParams = generateAlternativeTranscriptParams(videoId);
				
				// The expected params should be among the generated alternatives
				expect(generatedParams).toContain(expectedParams);
			});

			it("should match the originally extracted params (if available)", () => {
				const extractedParams = extractParamsFromHtml(htmlContent);
				
				if (extractedParams) {
					const generatedParams = generateAlternativeTranscriptParams(videoId);
					expect(generatedParams).toContain(extractedParams);
				} else {
					// If we can't extract params from HTML, just verify our expected value is generated
					const generatedParams = generateAlternativeTranscriptParams(videoId);
					expect(generatedParams).toContain(expectedParams);
				}
			});

			it("should generate all 4 parameter variations", () => {
				const generatedParams = generateAlternativeTranscriptParams(videoId);
				expect(generatedParams).toHaveLength(4);
				
				// Each param should be different
				const uniqueParams = new Set(generatedParams);
				expect(uniqueParams.size).toBe(4);
			});

			it("should generate valid base64 encoded params", () => {
				const generatedParams = generateAlternativeTranscriptParams(videoId);
				
				generatedParams.forEach((param, index) => {
					expect(typeof param).toBe("string");
					expect(param.length).toBeGreaterThan(0);
					
					// Should be valid base64 (with URL encoding)
					const base64Param = param.replace(/%3D/g, "=");
					expect(() => {
						Buffer.from(base64Param, "base64");
					}).not.toThrow();
					
					// Should contain the video ID when decoded
					const decoded = Buffer.from(base64Param, "base64");
					const decodedVideoId = decoded.subarray(2, 2 + videoId.length).toString();
					expect(decodedVideoId).toBe(videoId);
				});
			});
		});
	});

	describe("Parameter Generation Logic", () => {
		it("should generate different Field 2 values for ASR vs non-ASR styles", () => {
			const params = generateAlternativeTranscriptParams("testVideoId");
			
			// Decode and check Field 2 content
			const decodedParams = params.map(param => {
				const base64 = param.replace(/%3D/g, "=");
				return Buffer.from(base64, "base64");
			});

			// Should have variations with and without "asr" in Field 2
			const field2Values = decodedParams.map(decoded => {
				// Field 2 starts around byte 15 and has variable length
				const field2Start = 15;
				const field2Length = decoded[14]; // Length is encoded before the data
				return decoded.subarray(field2Start, field2Start + field2Length);
			});

			// Should have different Field 2 values
			const uniqueField2 = new Set(field2Values.map(buf => buf.toString()));
			expect(uniqueField2.size).toBeGreaterThan(1);
		});

		it("should generate different Field 6 values", () => {
			const params = generateAlternativeTranscriptParams("testVideoId");
			
			// Decode and check Field 6 values
			const field6Values = params.map(param => {
				const base64 = param.replace(/%3D/g, "=");
				const decoded = Buffer.from(base64, "base64");
				
				// Field 6 is near the end, look for the pattern 0x30 (field 6, varint)
				for (let i = decoded.length - 10; i < decoded.length - 1; i++) {
					if (decoded[i] === 0x30) { // Field 6 tag
						return decoded[i + 1]; // Field 6 value
					}
				}
				return null;
			});

			// Should have both 0 and 1 values for Field 6
			expect(field6Values).toContain(0);
			expect(field6Values).toContain(1);
		});
	});
});