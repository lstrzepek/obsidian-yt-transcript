import { getTranscriptBlocks } from "../src/render-utils";
import { TranscriptLine, Chapter } from "../src/types";

describe("getTranscriptBlocks", () => {
	describe("without chapters", () => {
		it("should group lines based on timestampMod", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 1000, duration: 1000 },
				{ text: "Line 3", offset: 2000, duration: 1000 },
				{ text: "Line 4", offset: 3000, duration: 1000 },
				{ text: "Line 5", offset: 4000, duration: 1000 },
				{ text: "Line 6", offset: 5000, duration: 1000 },
			];

			const blocks = getTranscriptBlocks(lines, 2);

			expect(blocks).toHaveLength(3);
			expect(blocks[0].quote).toBe("Line 1 Line 2");
			expect(blocks[0].quoteTimeOffset).toBe(0);
			expect(blocks[1].quote).toBe("Line 3 Line 4");
			expect(blocks[1].quoteTimeOffset).toBe(2000);
			expect(blocks[2].quote).toBe("Line 5 Line 6");
			expect(blocks[2].quoteTimeOffset).toBe(4000);
		});

		it("should handle single line", () => {
			const lines: TranscriptLine[] = [
				{ text: "Only line", offset: 0, duration: 1000 },
			];

			const blocks = getTranscriptBlocks(lines, 5);

			expect(blocks).toHaveLength(1);
			expect(blocks[0].quote).toBe("Only line");
			expect(blocks[0].quoteTimeOffset).toBe(0);
		});

		it("should handle empty array", () => {
			const blocks = getTranscriptBlocks([], 5);
			expect(blocks).toHaveLength(0);
		});

		it("should handle timestampMod of 1", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 1000, duration: 1000 },
				{ text: "Line 3", offset: 2000, duration: 1000 },
			];

			const blocks = getTranscriptBlocks(lines, 1);

			expect(blocks).toHaveLength(3);
			expect(blocks[0].quote).toBe("Line 1");
			expect(blocks[1].quote).toBe("Line 2");
			expect(blocks[2].quote).toBe("Line 3");
		});

		it("should handle timestampMod larger than line count", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 1000, duration: 1000 },
			];

			const blocks = getTranscriptBlocks(lines, 10);

			expect(blocks).toHaveLength(1);
			expect(blocks[0].quote).toBe("Line 1 Line 2");
		});
	});

	describe("with chapters", () => {
		it("should include chapter at exact timestamp", () => {
			const lines: TranscriptLine[] = [
				{ text: "Intro line 1", offset: 0, duration: 1000 },
				{ text: "Intro line 2", offset: 1000, duration: 1000 },
				{ text: "Chapter 1 line 1", offset: 60000, duration: 1000 },
				{ text: "Chapter 1 line 2", offset: 61000, duration: 1000 },
			];

			const chapters: Chapter[] = [
				{ title: "Introduction", startTime: 0 },
				{ title: "Chapter 1", startTime: 60000 },
			];

			const blocks = getTranscriptBlocks(lines, 5, chapters);

			// First block should have Introduction chapter
			expect(blocks[0].chapter).toBe("Introduction");
			expect(blocks[0].quoteTimeOffset).toBe(0);

			// Second block should have Chapter 1 at its exact timestamp
			const chapter1Block = blocks.find((b) => b.chapter === "Chapter 1");
			expect(chapter1Block).toBeDefined();
			expect(chapter1Block!.quoteTimeOffset).toBe(60000);
		});

		it("should break interval at chapter boundary", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 1000, duration: 1000 },
				{ text: "Line 3", offset: 2000, duration: 1000 }, // Chapter starts here
				{ text: "Line 4", offset: 3000, duration: 1000 },
				{ text: "Line 5", offset: 4000, duration: 1000 },
			];

			const chapters: Chapter[] = [
				{ title: "Part 1", startTime: 0 },
				{ title: "Part 2", startTime: 2000 },
			];

			// With timestampMod=5, without chapters it would be 1 block
			// With chapters, it should break at chapter boundary
			const blocks = getTranscriptBlocks(lines, 5, chapters);

			expect(blocks.length).toBeGreaterThan(1);
			expect(blocks[0].chapter).toBe("Part 1");
			expect(blocks[0].quote).toContain("Line 1");
			expect(blocks[0].quote).toContain("Line 2");

			const part2Block = blocks.find((b) => b.chapter === "Part 2");
			expect(part2Block).toBeDefined();
			expect(part2Block!.quoteTimeOffset).toBe(2000);
			expect(part2Block!.quote).toContain("Line 3");
		});

		it("should reset interval counter after chapter", () => {
			const lines: TranscriptLine[] = [
				{ text: "A1", offset: 0, duration: 1000 },
				{ text: "A2", offset: 1000, duration: 1000 },
				// Chapter B starts at 2000
				{ text: "B1", offset: 2000, duration: 1000 },
				{ text: "B2", offset: 3000, duration: 1000 },
				{ text: "B3", offset: 4000, duration: 1000 },
				{ text: "B4", offset: 5000, duration: 1000 },
			];

			const chapters: Chapter[] = [
				{ title: "Chapter A", startTime: 0 },
				{ title: "Chapter B", startTime: 2000 },
			];

			// timestampMod=2 means blocks every 2 lines
			const blocks = getTranscriptBlocks(lines, 2, chapters);

			// Chapter A block
			expect(blocks[0].chapter).toBe("Chapter A");
			expect(blocks[0].quote).toBe("A1 A2");

			// Chapter B should start fresh, interval resets
			expect(blocks[1].chapter).toBe("Chapter B");
			expect(blocks[1].quote).toBe("B1 B2");

			// Next block within Chapter B (no chapter header)
			expect(blocks[2].chapter).toBeUndefined();
			expect(blocks[2].quote).toBe("B3 B4");
		});

		it("should handle chapter starting mid-block", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 5000, duration: 1000 }, // Chapter starts at 3000, before this line
				{ text: "Line 3", offset: 6000, duration: 1000 },
			];

			const chapters: Chapter[] = [{ title: "New Chapter", startTime: 3000 }];

			const blocks = getTranscriptBlocks(lines, 5, chapters);

			// First block should be before chapter
			expect(blocks[0].chapter).toBeUndefined();
			expect(blocks[0].quote).toBe("Line 1");

			// Second block should have chapter at chapter's exact timestamp
			expect(blocks[1].chapter).toBe("New Chapter");
			expect(blocks[1].quoteTimeOffset).toBe(3000);
		});

		it("should handle unsorted chapters", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 60000, duration: 1000 },
				{ text: "Line 3", offset: 120000, duration: 1000 },
			];

			// Chapters provided in wrong order
			const chapters: Chapter[] = [
				{ title: "Chapter 2", startTime: 60000 },
				{ title: "Chapter 1", startTime: 0 },
				{ title: "Chapter 3", startTime: 120000 },
			];

			const blocks = getTranscriptBlocks(lines, 1, chapters);

			expect(blocks[0].chapter).toBe("Chapter 1");
			expect(blocks[1].chapter).toBe("Chapter 2");
			expect(blocks[2].chapter).toBe("Chapter 3");
		});

		it("should not duplicate chapter headers", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 1000, duration: 1000 },
				{ text: "Line 3", offset: 2000, duration: 1000 },
			];

			const chapters: Chapter[] = [{ title: "Only Chapter", startTime: 0 }];

			const blocks = getTranscriptBlocks(lines, 1, chapters);

			// Only first block should have chapter
			expect(blocks[0].chapter).toBe("Only Chapter");
			expect(blocks[1].chapter).toBeUndefined();
			expect(blocks[2].chapter).toBeUndefined();
		});

		it("should handle empty chapters array", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 1000, duration: 1000 },
			];

			const blocks = getTranscriptBlocks(lines, 2, []);

			expect(blocks).toHaveLength(1);
			expect(blocks[0].chapter).toBeUndefined();
		});

		it("should handle undefined chapters", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 1000, duration: 1000 },
				{ text: "Line 3", offset: 2000, duration: 1000 },
				{ text: "Line 4", offset: 3000, duration: 1000 },
			];

			const blocks = getTranscriptBlocks(lines, 2, undefined);

			expect(blocks).toHaveLength(2);
			expect(blocks[0].chapter).toBeUndefined();
			expect(blocks[1].chapter).toBeUndefined();
			expect(blocks[0].quote).toBe("Line 1 Line 2");
			expect(blocks[1].quote).toBe("Line 3 Line 4");
		});

		it("should not add chapter property when no chapters provided", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 1000, duration: 1000 },
			];

			const blocksWithoutChapters = getTranscriptBlocks(lines, 1);
			const blocksWithEmptyChapters = getTranscriptBlocks(lines, 1, []);
			const blocksWithUndefinedChapters = getTranscriptBlocks(
				lines,
				1,
				undefined,
			);

			// All should have no chapter property set
			for (const blocks of [
				blocksWithoutChapters,
				blocksWithEmptyChapters,
				blocksWithUndefinedChapters,
			]) {
				expect(blocks.every((b) => b.chapter === undefined)).toBe(true);
			}
		});

		it("should handle chapter with same title", () => {
			const lines: TranscriptLine[] = [
				{ text: "Line 1", offset: 0, duration: 1000 },
				{ text: "Line 2", offset: 60000, duration: 1000 },
			];

			// Two chapters with same title (edge case)
			const chapters: Chapter[] = [
				{ title: "Same Title", startTime: 0 },
				{ title: "Same Title", startTime: 60000 },
			];

			const blocks = getTranscriptBlocks(lines, 1, chapters);

			// First occurrence should have chapter, second should be skipped (same title)
			expect(blocks[0].chapter).toBe("Same Title");
			expect(blocks[1].chapter).toBeUndefined();
		});
	});
});
