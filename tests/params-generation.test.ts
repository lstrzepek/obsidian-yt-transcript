import { generateAlternativeTranscriptParams } from "../src/api-parser";

describe("Transcript Params Generation", () => {
	interface TestCase {
		videoId: string;
		expectedParams: string;
		description: string;
	}

	const testCases: TestCase[] = [
		{
			videoId: "kNNGOrJDdO8",
			expectedParams:
				"CgtrTk5HT3JKRGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D",
			description: "English auto-generated captions",
		},
		{
			videoId: "rOSZOCoqOo8",
			expectedParams:
				"CgtyT1NaT0NvcU9vOBIOQ2dBU0FtVnVHZ0ElM0QYASozZW5nYWdlbWVudC1wYW5lbC1zZWFyY2hhYmxlLXRyYW5zY3JpcHQtc2VhcmNoLXBhbmVsMAA4AUAB",
			description: "Mixed manual and auto-generated captions",
		},
		{
			videoId: "sLgHqZSe2o0",
			expectedParams:
				"CgtzTGdIcVpTZTJvMBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D",
			description: "Non-English auto-generated captions only",
		},
	];

	function extractVideoIdFromHtml(htmlContent: string): string | null {
		const CANONICAL_REGEX = /<link\s+rel="canonical"\s+href="([^"]*)">/;
		const videoIdMatch = htmlContent.match(CANONICAL_REGEX);
		if (videoIdMatch) {
			const url = videoIdMatch[1];
			const videoIdMatches = url.match(/[?&]v=([^&]+)/);
			if (videoIdMatches) {
				return videoIdMatches[1];
			}
		}
		return null;
	}

	function createMockHtmlWithVideoId(videoId: string): string {
		return `
			<!DOCTYPE html>
			<html>
			<head>
				<link rel="canonical" href="https://www.youtube.com/watch?v=${videoId}">
			</head>
			<body></body>
			</html>
		`;
	}

	testCases.forEach(({ videoId, expectedParams, description }) => {
		describe(`${videoId} (${description})`, () => {
			it("should extract correct video ID from HTML", () => {
				const mockHtml = createMockHtmlWithVideoId(videoId);
				const extractedVideoId = extractVideoIdFromHtml(mockHtml);
				expect(extractedVideoId).toBe(videoId);
			});

			it("should generate params that match expected value", () => {
				const generatedParams =
					generateAlternativeTranscriptParams(videoId);

				// The expected params should be among the generated alternatives
				expect(generatedParams).toContain(expectedParams);
			});

			it("should generate all 4 parameter variations", () => {
				const generatedParams =
					generateAlternativeTranscriptParams(videoId);
				expect(generatedParams).toHaveLength(4);

				// Each param should be different
				const uniqueParams = new Set(generatedParams);
				expect(uniqueParams.size).toBe(4);
			});

			it("should generate valid base64 encoded params", () => {
				const generatedParams =
					generateAlternativeTranscriptParams(videoId);

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
					const decodedVideoId = decoded
						.subarray(2, 2 + videoId.length)
						.toString();
					expect(decodedVideoId).toBe(videoId);
				});
			});
		});
	});

	describe("Parameter Generation Logic", () => {
		it("should generate different Field 2 values for ASR vs non-ASR styles", () => {
			const params = generateAlternativeTranscriptParams("testVideoId");

			// Decode and check Field 2 content
			const decodedParams = params.map((param) => {
				const base64 = param.replace(/%3D/g, "=");
				return Buffer.from(base64, "base64");
			});

			// Should have variations with and without "asr" in Field 2
			const field2Values = decodedParams.map((decoded) => {
				// Field 2 starts around byte 15 and has variable length
				const field2Start = 15;
				const field2Length = decoded[14]; // Length is encoded before the data
				return decoded.subarray(
					field2Start,
					field2Start + field2Length,
				);
			});

			// Should have different Field 2 values
			const uniqueField2 = new Set(
				field2Values.map((buf) => buf.toString()),
			);
			expect(uniqueField2.size).toBeGreaterThan(1);
		});

		it("should generate different Field 6 values", () => {
			const params = generateAlternativeTranscriptParams("testVideoId");

			// Decode and check Field 6 values
			const field6Values = params.map((param) => {
				const base64 = param.replace(/%3D/g, "=");
				const decoded = Buffer.from(base64, "base64");

				// Field 6 is near the end, look for the pattern 0x30 (field 6, varint)
				for (let i = decoded.length - 10; i < decoded.length - 1; i++) {
					if (decoded[i] === 0x30) {
						// Field 6 tag
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
