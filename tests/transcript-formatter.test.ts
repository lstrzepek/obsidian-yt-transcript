import {
	TranscriptFormatter,
	FormatOptions,
	FormatTemplate,
} from "../src/transcript-formatter";
import { TranscriptResponse } from "../src/types";

describe("TranscriptFormatter", () => {
	const mockTranscriptResponse: TranscriptResponse = {
		title: "Test Video Title",
		lines: [
			{ text: "Hello world", offset: 0, duration: 2000 },
			{ text: "This is a test", offset: 2000, duration: 3000 },
			{ text: "of the transcript", offset: 5000, duration: 2500 },
			{ text: "formatting system", offset: 7500, duration: 3000 },
			{ text: "with multiple lines", offset: 10500, duration: 2800 },
			{
				text: "for comprehensive testing",
				offset: 13300,
				duration: 4000,
			},
		],
	};

	const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

	describe("format", () => {
		describe("minimal template", () => {
			it("should return plain text without timestamps", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						timestampMod: 5,
						template: FormatTemplate.MINIMAL,
					},
				);
				expect(result).toBe(
					"Hello world This is a test of the transcript formatting system with multiple lines for comprehensive testing",
				);
			});

			it("should join transcript lines with spaces", () => {
				const simpleTranscript: TranscriptResponse = {
					title: "Simple Test",
					lines: [
						{ text: "First", offset: 0, duration: 1000 },
						{ text: "Second", offset: 1000, duration: 1000 },
						{ text: "Third", offset: 2000, duration: 1000 },
					],
				};
				const result = TranscriptFormatter.format(
					simpleTranscript,
					testUrl,
					{
						timestampMod: 1,
						template: FormatTemplate.MINIMAL,
					},
				);
				expect(result).toBe("First Second Third");
			});

			it("should trim extra whitespace", () => {
				const spacedTranscript: TranscriptResponse = {
					title: "Spaced Test",
					lines: [
						{ text: "  Spaced  ", offset: 0, duration: 1000 },
						{ text: "   Text   ", offset: 1000, duration: 1000 },
					],
				};
				const result = TranscriptFormatter.format(
					spacedTranscript,
					testUrl,
					{
						timestampMod: 1,
						template: FormatTemplate.MINIMAL,
					},
				);
				expect(result).toBe("Spaced Text");
			});
		});

		describe("standard template", () => {
			it("should include clickable timestamps", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						timestampMod: 2,
						template: FormatTemplate.STANDARD,
					},
				);

				expect(result).toContain(
					"[00:00](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=0)",
				);
				expect(result).toContain(
					"[00:05](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5)",
				);
				expect(result).toContain(
					"[00:10](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10)",
				);
			});

			it("should format timestamps correctly", () => {
				const timestampTranscript: TranscriptResponse = {
					title: "Timestamp Test",
					lines: [
						{ text: "Start", offset: 0, duration: 1000 },
						{ text: "One minute", offset: 60000, duration: 1000 },
						{ text: "One hour", offset: 3600000, duration: 1000 },
					],
				};
				const result = TranscriptFormatter.format(
					timestampTranscript,
					testUrl,
					{
						timestampMod: 1,
						template: FormatTemplate.STANDARD,
					},
				);

				expect(result).toContain("[00:00]");
				expect(result).toContain("[01:00]");
				expect(result).toContain("[01:00:00]");
			});

			it("should include proper YouTube links with time parameters", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						timestampMod: 2,
						template: FormatTemplate.STANDARD,
					},
				);

				expect(result).toContain("&t=0) Hello world This is a test");
				expect(result).toContain(
					"&t=5) of the transcript formatting system",
				);
				expect(result).toContain(
					"&t=10) with multiple lines for comprehensive testing",
				);
			});

			it("should handle transcript blocks based on timestampMod", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						timestampMod: 3,
						template: FormatTemplate.STANDARD,
					},
				);

				// With timestampMod=3, should have blocks at indices 0, 3
				expect(result).toContain("[00:00]");
				expect(result).toContain("[00:07]"); // offset 7500ms

				// Should not have timestamps for every line
				const timestampCount = (result.match(/\[/g) || []).length;
				expect(timestampCount).toBeLessThan(6); // Less than total number of lines
			});

			it("should handle URLs with existing parameters", () => {
				const urlWithParams =
					"https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest";
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					urlWithParams,
					{
						timestampMod: 2,
						template: FormatTemplate.STANDARD,
					},
				);

				expect(result).toContain("&list=PLtest&t=0)");
				expect(result).toContain("&list=PLtest&t=5)");
			});
		});

		describe("rich template", () => {
			it("should include video title", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						timestampMod: 2,
						template: FormatTemplate.RICH,
					},
				);
				expect(result).toContain("## Test Video Title");
			});

			it("should include source URL", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						timestampMod: 2,
						template: FormatTemplate.RICH,
					},
				);
				expect(result).toContain(
					"**Source**: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
				);
			});

			it("should include retrieval date", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						timestampMod: 2,
						template: FormatTemplate.RICH,
					},
				);
				const today = new Date().toISOString().split("T")[0];
				expect(result).toContain(`**Retrieved**: ${today}`);
			});

			it("should include all standard formatting", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						timestampMod: 2,
						template: FormatTemplate.RICH,
					},
				);

				// Should contain timestamp links
				expect(result).toContain(
					"[00:00](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=0)",
				);
				expect(result).toContain(
					"[00:05](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5)",
				);

				// Should contain transcript text
				expect(result).toContain("Hello world This is a test");
				expect(result).toContain("of the transcript formatting system");
			});

			it("should handle empty title gracefully", () => {
				const noTitleTranscript: TranscriptResponse = {
					title: "",
					lines: [
						{ text: "Test content", offset: 0, duration: 1000 },
					],
				};
				const result = TranscriptFormatter.format(
					noTitleTranscript,
					testUrl,
					{
						timestampMod: 1,
						template: FormatTemplate.RICH,
					},
				);
				expect(result).toContain("## YouTube Transcript");
			});

			it("should handle missing title gracefully", () => {
				const noTitleTranscript: TranscriptResponse = {
					title: undefined as any,
					lines: [
						{ text: "Test content", offset: 0, duration: 1000 },
					],
				};
				const result = TranscriptFormatter.format(
					noTitleTranscript,
					testUrl,
					{
						timestampMod: 1,
						template: FormatTemplate.RICH,
					},
				);
				expect(result).toContain("## YouTube Transcript");
			});
		});

		describe("template handling", () => {
			const defaultOptions: FormatOptions = { timestampMod: 5 };

			it("should use default template when not specified", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					defaultOptions,
				);

				// Should default to standard format
				expect(result).toContain("[00:00]");
				expect(result).not.toContain("**Source**");
				expect(result).not.toContain("## Test Video Title");
			});

			it("should handle invalid template types gracefully", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{
						...defaultOptions,
						template: "invalid" as any,
					},
				);

				// Should default to standard format
				expect(result).toContain("[00:00]");
				expect(result).not.toContain("**Source**");
			});

			it("should apply timestampMod correctly across all templates", () => {
				const optionsWithMod: FormatOptions = {
					timestampMod: 2,
					template: FormatTemplate.STANDARD,
				};
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					optionsWithMod,
				);

				// Should have timestamps every 2 lines
				const timestampCount = (result.match(/\[/g) || []).length;
				expect(timestampCount).toBe(3); // Lines 0, 2, 4 (plus final block)
			});
		});

		describe("edge cases and error handling", () => {
			it("should handle empty transcript", () => {
				const emptyTranscript: TranscriptResponse = {
					title: "Empty Test",
					lines: [],
				};
				const result = TranscriptFormatter.format(
					emptyTranscript,
					testUrl,
					{
						timestampMod: 5,
						template: FormatTemplate.STANDARD,
					},
				);
				expect(result).toBe("");
			});

			it("should handle single line transcript", () => {
				const singleLineTranscript: TranscriptResponse = {
					title: "Single Line",
					lines: [
						{ text: "Only one line", offset: 0, duration: 2000 },
					],
				};
				const result = TranscriptFormatter.format(
					singleLineTranscript,
					testUrl,
					{
						timestampMod: 1,
						template: FormatTemplate.MINIMAL,
					},
				);
				expect(result).toBe("Only one line");
			});

			it("should handle null transcript response", () => {
				const result = TranscriptFormatter.format(
					null as any,
					testUrl,
					{ timestampMod: 5 },
				);
				expect(result).toBe("");
			});

			it("should handle undefined transcript response", () => {
				const result = TranscriptFormatter.format(
					undefined as any,
					testUrl,
					{ timestampMod: 5 },
				);
				expect(result).toBe("");
			});

			it("should handle null URL", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					null as any,
					{ timestampMod: 5 },
				);
				expect(result).toContain("Hello world This is a test"); // Should still format text
			});

			it("should handle empty URL", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					"",
					{ timestampMod: 5 },
				);
				expect(result).toContain("Hello world This is a test"); // Should still format text
			});

			it("should handle zero timestampMod", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{ timestampMod: 0 },
				);
				// Should default to showing every line or handle gracefully
				expect(result).toContain("Hello world");
			});

			it("should handle negative timestampMod", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{ timestampMod: -1 },
				);
				// Should handle gracefully
				expect(result).toContain("Hello world");
			});

			it("should handle timestampMod larger than transcript length", () => {
				const result = TranscriptFormatter.format(
					mockTranscriptResponse,
					testUrl,
					{ timestampMod: 100 },
				);
				// Should create single block with all content
				expect(result).toContain("[00:00]");
				expect(result).toContain("Hello world");
				expect(result).toContain("for comprehensive testing");
			});
		});
	});
});
