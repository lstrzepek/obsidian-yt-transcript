import type { TranscriptLine } from "./types";

const TEXT_TAG_PATTERN =
	/<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;

const P_TAG_PATTERN = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;

export function parseTranscriptXml(xmlContent: string): TranscriptLine[] {
	const lines: TranscriptLine[] = [];

	for (const match of xmlContent.matchAll(TEXT_TAG_PATTERN)) {
		const startSeconds = parseFloat(match[1]);
		const durationSeconds = parseFloat(match[2]);
		const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ""));

		if (text) {
			lines.push({
				text,
				offset: Math.round(startSeconds * 1000),
				duration: Math.round(durationSeconds * 1000),
			});
		}
	}

	if (lines.length === 0) {
		for (const match of xmlContent.matchAll(P_TAG_PATTERN)) {
			const offset = parseInt(match[1], 10);
			const duration = parseInt(match[2], 10);
			const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ""));

			if (text) {
				lines.push({ text, offset, duration });
			}
		}
	}

	return lines;
}

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, code) =>
			String.fromCharCode(parseInt(code, 10)),
		)
		.replace(/&#x([a-fA-F0-9]+);/g, (_, code) =>
			String.fromCharCode(parseInt(code, 16)),
		)
		.replace(/\n/g, " ")
		.trim();
}
