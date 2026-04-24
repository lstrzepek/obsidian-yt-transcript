import { buildTimestampUrl } from "src/youtube/url";

import { getTranscriptBlocks } from "./blocks";
import { formatTimestamp } from "./timestamp";
import type { TranscriptResponse } from "./types";

export type FormatTemplate = "minimal" | "standard" | "rich";

export interface FormatOptions {
	timestampMod: number;
	template?: FormatTemplate;
}

export function formatTranscript(
	transcript: TranscriptResponse,
	url: string,
	options: FormatOptions,
): string {
	if (!transcript?.lines || !Array.isArray(transcript.lines)) return "";
	if (transcript.lines.length === 0) return "";

	const normalized = normalizeOptions(options);

	switch (normalized.template) {
		case "minimal":
			return formatMinimal(transcript);
		case "rich":
			return formatRich(transcript, url, normalized);
		case "standard":
		default:
			return formatStandard(transcript, url, normalized);
	}
}

function normalizeOptions(options: FormatOptions): Required<FormatOptions> {
	const timestampMod =
		options.timestampMod <= 0
			? 1
			: Math.max(1, Math.floor(options.timestampMod)) || 5;
	return {
		timestampMod,
		template: options.template ?? "standard",
	};
}

function formatMinimal(transcript: TranscriptResponse): string {
	return transcript.lines
		.map((line) => line.text.trim())
		.filter((text) => text.length > 0)
		.join(" ");
}

function formatStandard(
	transcript: TranscriptResponse,
	url: string,
	options: Required<FormatOptions>,
): string {
	const blocks = getTranscriptBlocks(transcript.lines, options.timestampMod);
	if (blocks.length === 0) return "";

	return blocks
		.map(({ quote, quoteTimeOffset }) => {
			const timestamp = formatTimestamp(quoteTimeOffset);
			const href = url ? buildTimestampUrl(url, quoteTimeOffset) : "#";
			return `[${timestamp}](${href}) ${quote.trim()}`;
		})
		.join("\n");
}

function formatRich(
	transcript: TranscriptResponse,
	url: string,
	options: Required<FormatOptions>,
): string {
	const title = transcript.title?.trim() || "YouTube Transcript";
	const today = new Date().toISOString().split("T")[0];
	const sourceUrl = url || "Unknown";

	const header = [
		`## ${title}`,
		`**Source**: ${sourceUrl}`,
		`**Retrieved**: ${today}`,
		"",
	].join("\n");

	return header + formatStandard(transcript, url, options);
}
