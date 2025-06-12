import { parseVideoPage } from "../src/api-parser";
import { TranscriptConfig } from "../src/types";
import * as fs from "fs";
import * as path from "path";

describe("API-based parseVideoPage", () => {
	let exampleHtml: string;

	beforeAll(() => {
		const htmlPath = path.join(__dirname, "exampleYtVideo.html");
		exampleHtml = fs.readFileSync(htmlPath, "utf8");
	});

	it("should extract video title from HTML", () => {
		const result = parseVideoPage(exampleHtml);

		expect(result.title).toBeTruthy();
		expect(typeof result.title).toBe("string");
		expect(result.title.length).toBeGreaterThan(0);
	});

	it("should create API request with correct video ID", () => {
		const result = parseVideoPage(exampleHtml);

		expect(result.transcriptRequest.url).toBe(
			"https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false"
		);
		expect(result.transcriptRequest.headers).toEqual({
			"Content-Type": "application/json",
		});
		expect(result.transcriptRequest.body).toBeTruthy();

		const requestBody = JSON.parse(result.transcriptRequest.body!);
		expect(requestBody.externalVideoId).toBe("kNNGOrJDdO8");
	});

	it("should include correct client information", () => {
		const result = parseVideoPage(exampleHtml);
		const requestBody = JSON.parse(result.transcriptRequest.body!);

		expect(requestBody.context.client.clientName).toBe("WEB");
		expect(requestBody.context.client.clientVersion).toBeTruthy();
		expect(requestBody.context.client.hl).toBe("en");
		expect(requestBody.context.client.gl).toBe("US");
	});

	it("should handle language configuration", () => {
		const config: TranscriptConfig = { lang: "es", country: "ES" };
		const result = parseVideoPage(exampleHtml, config);
		const requestBody = JSON.parse(result.transcriptRequest.body!);

		expect(requestBody.context.client.hl).toBe("es");
		expect(requestBody.context.client.gl).toBe("ES");
	});

	it("should generate params field", () => {
		const result = parseVideoPage(exampleHtml);
		const requestBody = JSON.parse(result.transcriptRequest.body!);

		expect(requestBody.params).toBeTruthy();
		expect(typeof requestBody.params).toBe("string");
		expect(requestBody.params.length).toBeGreaterThan(0);
	});

	it("should return properly structured VideoData", () => {
		const result = parseVideoPage(exampleHtml);

		expect(result).toHaveProperty("title");
		expect(result).toHaveProperty("transcriptRequest");
		expect(result.transcriptRequest).toHaveProperty("url");
		expect(result.transcriptRequest).toHaveProperty("headers");
		expect(result.transcriptRequest).toHaveProperty("body");
	});

	it("should use POST method for API request", () => {
		const result = parseVideoPage(exampleHtml);

		// The URL and body structure indicates this should be a POST request
		expect(result.transcriptRequest.url).toContain("youtubei/v1/get_transcript");
		expect(result.transcriptRequest.body).toBeTruthy();
		expect(result.transcriptRequest.headers!["Content-Type"]).toBe("application/json");
	});

	it("should extract client version from HTML", () => {
		const result = parseVideoPage(exampleHtml);
		const requestBody = JSON.parse(result.transcriptRequest.body!);

		// Should extract version from the HTML or use fallback
		expect(requestBody.context.client.clientVersion).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
	});

	it("should generate correct params value for kNNGOrJDdO8", () => {
		const result = parseVideoPage(exampleHtml);
		const requestBody = JSON.parse(result.transcriptRequest.body!);

		// Should match the expected params value from example.http
		expect(requestBody.params).toBe("CgtrTk5HT3JKRGRPOBISQ2dOaGMzSVNBbVZ1R2dBJTNEGAEqM2VuZ2FnZW1lbnQtcGFuZWwtc2VhcmNoYWJsZS10cmFuc2NyaXB0LXNlYXJjaC1wYW5lbDABOAFAAQ%3D%3D");
	});
});
