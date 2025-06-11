import { parseVideoPage } from "../src/caption-parser";
import { TranscriptConfig } from "../src/types";
import * as fs from "fs";
import * as path from "path";

describe("parseVideoPage", () => {
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

	it("should extract transcript request URL", () => {
		const result = parseVideoPage(exampleHtml);

		expect(result.transcriptRequest).toBeDefined();
		expect(result.transcriptRequest.url).toBeTruthy();
		expect(typeof result.transcriptRequest.url).toBe("string");
		expect(result.transcriptRequest.url).toMatch(/^https:\/\//);
	});

	it("should handle default language (en)", () => {
		const result = parseVideoPage(exampleHtml);

		expect(result.transcriptRequest.url).toBeTruthy();
		// Should get a caption track (default behavior)
	});

	it("should handle specific language preference", () => {
		const config: TranscriptConfig = { lang: "es" };
		const result = parseVideoPage(exampleHtml, config);

		expect(result.transcriptRequest.url).toBeTruthy();
		// Should attempt to find Spanish captions or fall back to first available
	});

	it("should handle non-existent language preference gracefully", () => {
		const config: TranscriptConfig = { lang: "nonexistent" };
		const result = parseVideoPage(exampleHtml, config);

		expect(result.transcriptRequest.url).toBeTruthy();
		// Should fall back to first available caption track
	});

	it("should return properly structured VideoData", () => {
		const result = parseVideoPage(exampleHtml);

		expect(result).toHaveProperty("title");
		expect(result).toHaveProperty("transcriptRequest");
		expect(result.transcriptRequest).toHaveProperty("url");
		expect(typeof result.title).toBe("string");
		expect(typeof result.transcriptRequest.url).toBe("string");
	});

	it("should handle country config parameter", () => {
		const config: TranscriptConfig = { lang: "en", country: "US" };
		const result = parseVideoPage(exampleHtml, config);

		expect(result.transcriptRequest.url).toBeTruthy();
		// Country parameter should not affect the parsing (it's used in other contexts)
	});

	it("should properly format caption URL", () => {
		const result = parseVideoPage(exampleHtml);

		expect(result.transcriptRequest.url).toMatch(/^https:\/\//);
		// Should ensure URL starts with https://
	});
});