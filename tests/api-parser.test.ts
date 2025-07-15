import {
	parseVideoPageWithFallbacks,
	extractParamsFromPage,
} from "../src/api-parser";
import { TranscriptConfig } from "../src/types";

describe("API-based parseVideoPage", () => {
	function createMockYouTubeHtml(
		videoId: string,
		videoTitle: string = "Test Video",
	): string {
		return `
			<!DOCTYPE html>
			<html>
			<head>
				<meta name="title" content="${videoTitle}">
				<link rel="canonical" href="https://www.youtube.com/watch?v=${videoId}">
			</head>
			<body>
				<script>
					var ytInitialData = {
						contents: {
							videoDetails: {
								videoId: "${videoId}",
								title: "${videoTitle}"
							}
						}
					};
				</script>
			</body>
			</html>
		`;
	}

	it("should generate correct params value for rOSZOCoqOo8", () => {
		const mockHtml = createMockYouTubeHtml("rOSZOCoqOo8", "Test Video 2");
		const result = parseVideoPageWithFallbacks(mockHtml);

		// Should include the expected params value among the fallback options
		const expectedParams =
			"CgtyT1NaT0NvcU9vOBIOQ2dBU0FtVnVHZ0ElM0QYASozZW5nYWdlbWVudC1wYW5lbC1zZWFyY2hhYmxlLXRyYW5zY3JpcHQtc2VhcmNoLXBhbmVsMAA4AUAB";
		const allParams = result.transcriptRequests.map(
			(req) => JSON.parse(req.body).params,
		);
		expect(allParams).toContain(expectedParams);
	});

	it("should generate correct params value for sLgHqZSe2o0", () => {
		const mockHtml = createMockYouTubeHtml("sLgHqZSe2o0", "Test Video 3");
		const result = parseVideoPageWithFallbacks(mockHtml);

		// Should include the expected params value among the fallback options
		const expectedParams =
			"CgtzTGdIcVpTZTJvMBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D";
		const allParams = result.transcriptRequests.map(
			(req) => JSON.parse(req.body).params,
		);
		expect(allParams).toContain(expectedParams);
	});
});

describe("extractParamsFromPage", () => {
	it("should extract params from ytInitialData getTranscriptEndpoint", () => {
		const htmlWithParams = `
			<script>
				var ytInitialData = {
					"contents": {
						"videoDetails": {
							"videoId": "test123"
						},
						"engagementPanels": [
							{
								"engagementPanelSectionListRenderer": {
									"content": {
										"transcriptRenderer": {
											"getTranscriptEndpoint": {
												"params": "CgtrTk5HT3JKZGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D"
											}
										}
									}
								}
							}
						]
					}
				};
			</script>
		`;

		const result = extractParamsFromPage(htmlWithParams);
		expect(result).toBe(
			"CgtrTk5HT3JKZGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D",
		);
	});

	it("should return null when ytInitialData has no getTranscriptEndpoint", () => {
		const htmlWithParams = `
			<script>
				var ytInitialData = {
					"contents": {
						"videoDetails": {
							"videoId": "test123"
						}
					}
				};
			</script>
		`;

		const result = extractParamsFromPage(htmlWithParams);
		expect(result).toBeNull();
	});

	it("should extract params from nested getTranscriptEndpoint", () => {
		const htmlWithParams = `
			<script>
				var ytInitialData = {
					"sidebar": {
						"playlistPanelRenderer": {
							"contents": [
								{
									"playlistPanelVideoRenderer": {
										"transcript": {
											"getTranscriptEndpoint": {
												"params": "CgtzTGdIcVpTZTJvMBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D"
											}
										}
									}
								}
							]
						}
					}
				};
			</script>
		`;

		const result = extractParamsFromPage(htmlWithParams);
		expect(result).toBe(
			"CgtzTGdIcVpTZTJvMBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D",
		);
	});

	it("should return null when getTranscriptEndpoint exists but has no params", () => {
		const htmlWithParams = `
			<script>
				var ytInitialData = {
					"contents": {
						"engagementPanels": [
							{
								"transcriptRenderer": {
									"getTranscriptEndpoint": {
										"videoId": "test123"
									}
								}
							}
						]
					}
				};
			</script>
		`;

		const result = extractParamsFromPage(htmlWithParams);
		expect(result).toBeNull();
	});

	it("should return null when no ytInitialData found", () => {
		const htmlWithoutParams = `
			<html>
				<body>
					<script>
						var someOtherData = {
							title: "Test Video",
							description: "Test Description"
						};
					</script>
				</body>
			</html>
		`;

		const result = extractParamsFromPage(htmlWithoutParams);
		expect(result).toBeNull();
	});

	it("should return null for empty HTML", () => {
		const result = extractParamsFromPage("");
		expect(result).toBeNull();
	});

	it("should ignore short params (less than 50 characters)", () => {
		const htmlWithShortParams = `
			<script>
				var ytInitialData = {
					"contents": {
						"transcriptRenderer": {
							"getTranscriptEndpoint": {
								"params": "shortParams123"
							}
						}
					}
				};
			</script>
		`;

		const result = extractParamsFromPage(htmlWithShortParams);
		expect(result).toBeNull();
	});

	it("should extract the first valid getTranscriptEndpoint when multiple exist", () => {
		const htmlWithMultipleParams = `
			<script>
				var ytInitialData = {
					"contents": {
						"engagementPanels": [
							{
								"transcriptRenderer": {
									"getTranscriptEndpoint": {
										"params": "CgtrTk5HT3JKZGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D"
									}
								}
							}
						],
						"sidebar": {
							"transcriptRenderer": {
								"getTranscriptEndpoint": {
									"params": "CgtyT1NaT0NvcU9vOBIOQ2dBU0FtVnVHZ0ElM0QYASozZW5nYWdlbWVudC1wYW5lbC1zZWFyY2hhYmxlLXRyYW5zY3JpcHQtc2VhcmNoLXBhbmVsMAA4AUAB"
								}
							}
						}
					}
				};
			</script>
		`;

		const result = extractParamsFromPage(htmlWithMultipleParams);
		expect(result).toBe(
			"CgtrTk5HT3JKZGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D",
		);
	});

	it("should extract params from mock HTML with getTranscriptEndpoint", () => {
		const mockHtmlWithParams = `
			<!DOCTYPE html>
			<html>
			<body>
				<script>
					var ytInitialData = {
						contents: {
							videoDetails: {
								videoId: "testVideo123"
							},
							engagementPanels: [
								{
									engagementPanelSectionListRenderer: {
										content: {
											transcriptRenderer: {
												getTranscriptEndpoint: {
													params: "CgtrTk5HT3JKZGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D"
												}
											}
										}
									}
								}
							]
						}
					};
				</script>
			</body>
			</html>
		`;

		const result = extractParamsFromPage(mockHtmlWithParams);
		expect(result).toBe(
			"CgtrTk5HT3JKZGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D",
		);
	});

	it("should return null for mock HTML without getTranscriptEndpoint", () => {
		const mockHtmlWithoutParams = `
			<!DOCTYPE html>
			<html>
			<body>
				<script>
					var ytInitialData = {
						contents: {
							videoDetails: {
								videoId: "testVideo123"
							}
						}
					};
				</script>
			</body>
			</html>
		`;

		const result = extractParamsFromPage(mockHtmlWithoutParams);
		expect(result).toBeNull();
	});
});
