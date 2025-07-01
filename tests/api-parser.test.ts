import { parseVideoPageWithFallbacks, extractParamsFromPage } from "../src/api-parser";
import { TranscriptConfig } from "../src/types";
import * as fs from "fs";
import * as path from "path";

describe("API-based parseVideoPage", () => {
	let exampleHtml: string;

	beforeAll(() => {
		const htmlPath = path.join(__dirname, "exampleYtVideo.html");
		exampleHtml = fs.readFileSync(htmlPath, "utf8");
	});

	it("should generate correct params value for rOSZOCoqOo8", () => {
		const htmlPath = path.join(__dirname, "exampleVideo2.html");
		exampleHtml = fs.readFileSync(htmlPath, "utf8");
		const result = parseVideoPageWithFallbacks(exampleHtml);
		
		// Should include the expected params value among the fallback options
		const expectedParams = "CgtyT1NaT0NvcU9vOBIOQ2dBU0FtVnVHZ0ElM0QYASozZW5nYWdlbWVudC1wYW5lbC1zZWFyY2hhYmxlLXRyYW5zY3JpcHQtc2VhcmNoLXBhbmVsMAA4AUAB";
		const allParams = result.transcriptRequests.map(req => JSON.parse(req.body).params);
		expect(allParams).toContain(expectedParams);
	});
	it("should generate correct params value for sLgHqZSe2o0", () => {
		const htmlPath = path.join(__dirname, "exampleVideo3.html");
		exampleHtml = fs.readFileSync(htmlPath, "utf8");
		const result = parseVideoPageWithFallbacks(exampleHtml);
		
		// Should include the expected params value among the fallback options
		const expectedParams = "CgtzTGdIcVpTZTJvMBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D";
		const allParams = result.transcriptRequests.map(req => JSON.parse(req.body).params);
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
		expect(result).toBe("CgtrTk5HT3JKZGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D");
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
		expect(result).toBe("CgtzTGdIcVpTZTJvMBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDAAOAFAAQ%3D%3D");
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
		expect(result).toBe("CgtrTk5HT3JKZGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D");
	});

	it("should try to extract params from real example HTML files", () => {
		const htmlPath = path.join(__dirname, "exampleYtVideo.html");
		const exampleHtml = fs.readFileSync(htmlPath, "utf8");
		
		const result = extractParamsFromPage(exampleHtml);
		
		if (result) {
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(10);
			console.log("Found params in exampleYtVideo.html:", result);
		} else {
			console.log("No params found in exampleYtVideo.html - this is expected for some videos");
		}
	});

	it("should try to extract params from example video 2", () => {
		const htmlPath = path.join(__dirname, "exampleVideo2.html");
		const exampleHtml = fs.readFileSync(htmlPath, "utf8");
		
		const result = extractParamsFromPage(exampleHtml);
		
		if (result) {
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(10);
			console.log("Found params in exampleVideo2.html:", result);
		} else {
			console.log("No params found in exampleVideo2.html - this is expected for some videos");
		}
	});

	it("should try to extract params from example video 3", () => {
		const htmlPath = path.join(__dirname, "exampleVideo3.html");
		const exampleHtml = fs.readFileSync(htmlPath, "utf8");
		
		const result = extractParamsFromPage(exampleHtml);
		
		if (result) {
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(10);
			console.log("Found params in exampleVideo3.html:", result);
		} else {
			console.log("No params found in exampleVideo3.html - this is expected for some videos");
		}
	});
});
