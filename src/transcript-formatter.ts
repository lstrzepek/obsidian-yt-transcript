import { TranscriptResponse } from "./types";
import { getTranscriptBlocks } from "./render-utils";
import { formatTimestamp } from "./timestampt-utils";
import { URLDetector } from "./url-detection";

export enum FormatTemplate {
	MINIMAL = "minimal",
	STANDARD = "standard",
	RICH = "rich",
}

export interface FormatOptions {
	timestampMod: number;
	template?: FormatTemplate;
}

export class TranscriptFormatter {
	/**
	 * Formats a transcript response according to the specified template and options
	 * @param transcript - The transcript response to format
	 * @param url - The source YouTube URL
	 * @param options - Formatting options including template and timestamp frequency
	 * @returns The formatted transcript string
	 */
	public static format(
		transcript: TranscriptResponse,
		url: string,
		options: FormatOptions,
	): string {
		// Handle edge cases
		if (
			!transcript ||
			!transcript.lines ||
			!Array.isArray(transcript.lines)
		) {
			return "";
		}

		if (transcript.lines.length === 0) {
			return "";
		}

		// Normalize options
		const normalizedOptions = this.normalizeOptions(options);
		const template = normalizedOptions.template || FormatTemplate.STANDARD;

		// Route to appropriate formatter based on template
		switch (template) {
			case FormatTemplate.MINIMAL:
				return this.formatMinimalTemplate(
					transcript,
					url,
					normalizedOptions,
				);
			case FormatTemplate.STANDARD:
				return this.formatStandardTemplate(
					transcript,
					url,
					normalizedOptions,
				);
			case FormatTemplate.RICH:
				return this.formatRichTemplate(
					transcript,
					url,
					normalizedOptions,
				);
			default:
				// Default to standard for invalid template types
				return this.formatStandardTemplate(
					transcript,
					url,
					normalizedOptions,
				);
		}
	}

	/**
	 * Convenience method to format transcript with minimal template
	 */
	public static formatMinimal(
		transcript: TranscriptResponse,
		url: string,
		options: Omit<FormatOptions, "template">,
	): string {
		return this.format(transcript, url, {
			...options,
			template: FormatTemplate.MINIMAL,
		});
	}

	/**
	 * Convenience method to format transcript with standard template
	 */
	public static formatStandard(
		transcript: TranscriptResponse,
		url: string,
		options: Omit<FormatOptions, "template">,
	): string {
		return this.format(transcript, url, {
			...options,
			template: FormatTemplate.STANDARD,
		});
	}

	/**
	 * Convenience method to format transcript with rich template
	 */
	public static formatRich(
		transcript: TranscriptResponse,
		url: string,
		options: Omit<FormatOptions, "template">,
	): string {
		return this.format(transcript, url, {
			...options,
			template: FormatTemplate.RICH,
		});
	}

	/**
	 * Normalizes and validates formatting options
	 */
	private static normalizeOptions(options: FormatOptions): FormatOptions {
		const normalized: FormatOptions = {
			timestampMod: Math.max(1, Math.floor(options.timestampMod)) || 5,
			template: options.template || FormatTemplate.STANDARD,
		};

		// Handle edge cases for timestampMod
		if (options.timestampMod <= 0) {
			normalized.timestampMod = 1; // Default to every line
		}

		return normalized;
	}

	/**
	 * Formats transcript as plain text without timestamps
	 */
	private static formatMinimalTemplate(
		transcript: TranscriptResponse,
		url: string,
		options: FormatOptions,
	): string {
		return transcript.lines
			.map((line) => line.text.trim())
			.filter((text) => text.length > 0)
			.join(" ");
	}

	/**
	 * Formats transcript with clickable timestamps
	 */
	private static formatStandardTemplate(
		transcript: TranscriptResponse,
		url: string,
		options: FormatOptions,
	): string {
		const blocks = getTranscriptBlocks(
			transcript.lines,
			options.timestampMod,
		);

		if (blocks.length === 0) {
			return "";
		}

		return blocks
			.map((block) => {
				const { quote, quoteTimeOffset } = block;
				const timestampStr = formatTimestamp(quoteTimeOffset);
				const timestampUrl = url
					? URLDetector.buildTimestampUrl(url, quoteTimeOffset)
					: "#";

				return `[${timestampStr}](${timestampUrl}) ${quote.trim()}`;
			})
			.join("\n");
	}

	/**
	 * Formats transcript with metadata header and clickable timestamps
	 */
	private static formatRichTemplate(
		transcript: TranscriptResponse,
		url: string,
		options: FormatOptions,
	): string {
		const title =
			transcript.title && transcript.title.trim()
				? transcript.title.trim()
				: "YouTube Transcript";

		const today = new Date().toISOString().split("T")[0];
		const sourceUrl = url || "Unknown";

		const header = [
			`## ${title}`,
			`**Source**: ${sourceUrl}`,
			`**Retrieved**: ${today}`,
			"", // Empty line before transcript
		].join("\n");

		const standardContent = this.formatStandardTemplate(
			transcript,
			url,
			options,
		);

		return header + standardContent;
	}
}
