import { URLDetector } from "../src/url-detection";

describe("URLDetector", () => {
	describe("isValidYouTubeUrl", () => {
		it("should validate youtube.com URLs", () => {
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
				),
			).toBe(true);
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://youtube.com/watch?v=dQw4w9WgXcQ",
				),
			).toBe(true);
			expect(
				URLDetector.isValidYouTubeUrl(
					"http://www.youtube.com/watch?v=dQw4w9WgXcQ",
				),
			).toBe(true);
		});

		it("should validate youtu.be URLs", () => {
			expect(
				URLDetector.isValidYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"),
			).toBe(true);
			expect(
				URLDetector.isValidYouTubeUrl("http://youtu.be/dQw4w9WgXcQ"),
			).toBe(true);
		});

		it("should handle URLs with timestamps", () => {
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123",
				),
			).toBe(true);
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://youtu.be/dQw4w9WgXcQ?t=123",
				),
			).toBe(true);
		});

		it("should handle URLs with extra parameters", () => {
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
				),
			).toBe(true);
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy6nuLMfO2NqoQrOhAY0vn1",
				),
			).toBe(true);
		});

		it("should reject non-YouTube URLs", () => {
			expect(
				URLDetector.isValidYouTubeUrl("https://www.google.com"),
			).toBe(false);
			expect(
				URLDetector.isValidYouTubeUrl("https://www.vimeo.com/123456"),
			).toBe(false);
			expect(
				URLDetector.isValidYouTubeUrl("https://www.facebook.com"),
			).toBe(false);
		});

		it("should handle malformed URLs", () => {
			expect(URLDetector.isValidYouTubeUrl("not a url")).toBe(false);
			expect(URLDetector.isValidYouTubeUrl("")).toBe(false);
			expect(URLDetector.isValidYouTubeUrl("youtube.com")).toBe(false); // no protocol
			expect(URLDetector.isValidYouTubeUrl("https://youtube")).toBe(
				false,
			); // incomplete
		});

		it("should handle mobile YouTube URLs", () => {
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://m.youtube.com/watch?v=dQw4w9WgXcQ",
				),
			).toBe(true);
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://mobile.youtube.com/watch?v=dQw4w9WgXcQ",
				),
			).toBe(true);
		});

		it("should handle YouTube Music URLs", () => {
			expect(
				URLDetector.isValidYouTubeUrl(
					"https://music.youtube.com/watch?v=dQw4w9WgXcQ",
				),
			).toBe(true);
		});

		it("should handle null and undefined", () => {
			expect(URLDetector.isValidYouTubeUrl(null as any)).toBe(false);
			expect(URLDetector.isValidYouTubeUrl(undefined as any)).toBe(false);
		});
	});

	describe("extractYouTubeUrlFromText", () => {
		it("should extract YouTube URL from text with multiple URLs", () => {
			const text =
				"Check out https://www.google.com and https://www.youtube.com/watch?v=dQw4w9WgXcQ and https://www.facebook.com";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		});

		it("should extract first YouTube URL when multiple exist", () => {
			const text =
				"First: https://www.youtube.com/watch?v=first123 Second: https://youtu.be/second456";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe("https://www.youtube.com/watch?v=first123");
		});

		it("should return null when no YouTube URL found", () => {
			const text =
				"Check out https://www.google.com and https://www.facebook.com";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe(null);
		});

		it("should handle text with no URLs", () => {
			const text = "This is just some text without any URLs";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe(null);
		});

		it("should handle empty text", () => {
			const result = URLDetector.extractYouTubeUrlFromText("");
			expect(result).toBe(null);
		});

		it("should extract URL when it's the only content", () => {
			const text = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		});

		it("should handle URLs with surrounding whitespace", () => {
			const text = "   https://www.youtube.com/watch?v=dQw4w9WgXcQ   ";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		});

		it("should handle URLs with newlines", () => {
			const text =
				"Check this out:\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\nAmazing video!";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		});

		it("should handle youtu.be URLs in text", () => {
			const text =
				"Short link: https://youtu.be/dQw4w9WgXcQ with timestamp";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe("https://youtu.be/dQw4w9WgXcQ");
		});

		it("should handle mobile YouTube URLs in text", () => {
			const text =
				"Mobile link: https://m.youtube.com/watch?v=dQw4w9WgXcQ from phone";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe("https://m.youtube.com/watch?v=dQw4w9WgXcQ");
		});

		it("should handle YouTube Music URLs in text", () => {
			const text =
				"Music: https://music.youtube.com/watch?v=dQw4w9WgXcQ great song";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe(
				"https://music.youtube.com/watch?v=dQw4w9WgXcQ",
			);
		});

		it("should handle null and undefined", () => {
			expect(URLDetector.extractYouTubeUrlFromText(null as any)).toBe(
				null,
			);
			expect(
				URLDetector.extractYouTubeUrlFromText(undefined as any),
			).toBe(null);
		});

		it("should extract URLs with complex parameters", () => {
			const text =
				"Playlist: https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy&index=1&t=123s";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe(
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmRdnEQy&index=1&t=123s",
			);
		});

		it("should ignore malformed YouTube-like URLs", () => {
			const text =
				"Bad: youtube.com/watch?v=123 Good: https://www.youtube.com/watch?v=dQw4w9WgXcQ";
			const result = URLDetector.extractYouTubeUrlFromText(text);
			expect(result).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		});
	});
});
