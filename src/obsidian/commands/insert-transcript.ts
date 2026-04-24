import { Editor, Notice } from "obsidian";

import { fetchTranscript } from "src/transcript/fetch";
import {
	formatTranscript,
	type FormatOptions,
	type FormatTemplate,
} from "src/transcript/format";
import type { TranscriptConfig } from "src/transcript/types";
import {
	extractYouTubeUrlFromText,
	isValidYouTubeUrl,
} from "src/youtube/url";

import { getSelectedText } from "../editor-extensions";
import { obsidianHttp } from "../http";
import { PromptModal } from "../modals/prompt-modal";

export interface InsertTranscriptOptions {
	template?: FormatTemplate;
	timestampMod?: number;
}

interface CommandContext {
	settings?: {
		lang?: string;
		country?: string;
		timestampMod?: number;
	};
}

export class InsertTranscriptCommand {
	constructor(private context: CommandContext) {}

	async execute(editor: Editor): Promise<void> {
		await this.executeWithOptions(editor, {});
	}

	async executeWithOptions(
		editor: Editor,
		options: InsertTranscriptOptions,
	): Promise<void> {
		try {
			const url = await this.getYouTubeUrlWithConfirmation(editor);
			if (!url) return;

			if (!isValidYouTubeUrl(url)) {
				new Notice("Not a valid YouTube URL.");
				return;
			}

			const transcript = await fetchTranscript(
				url,
				obsidianHttp,
				this.transcriptConfig(),
			);

			if (!transcript?.lines?.length) {
				new Notice("No transcript available for this video.");
				return;
			}

			const formatted = formatTranscript(
				transcript,
				url,
				this.mergeFormatOptions(options),
			);
			if (!formatted.trim()) return;

			editor.replaceRange(formatted, editor.getCursor());
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unknown error";
			new Notice(`Insert transcript failed: ${message}`);
		}
	}

	private async getYouTubeUrlWithConfirmation(
		editor: Editor,
	): Promise<string | null> {
		const detectedUrl = await this.detectYouTubeUrl(editor);

		try {
			const prompt = new PromptModal(detectedUrl || undefined);
			const userUrl = await new Promise<string>((resolve, reject) => {
				prompt.openAndGetValue(resolve, reject);
			});
			return userUrl.trim() || null;
		} catch {
			return null;
		}
	}

	private async detectYouTubeUrl(editor: Editor): Promise<string | null> {
		const selectionUrl = this.getUrlFromSelection(editor);
		if (selectionUrl) return selectionUrl;

		return this.getUrlFromClipboard();
	}

	private getUrlFromSelection(editor: Editor): string | null {
		try {
			const selectedText = editor.somethingSelected()
				? editor.getSelection()
				: getSelectedText(editor);
			return extractYouTubeUrlFromText(selectedText);
		} catch {
			return null;
		}
	}

	private async getUrlFromClipboard(): Promise<string | null> {
		try {
			const clipboardText = await navigator.clipboard.readText();
			return extractYouTubeUrlFromText(clipboardText);
		} catch {
			return null;
		}
	}

	private transcriptConfig(): TranscriptConfig {
		return {
			lang: this.context.settings?.lang,
			country: this.context.settings?.country,
		};
	}

	private mergeFormatOptions(
		options: InsertTranscriptOptions,
	): FormatOptions {
		return {
			template: options.template ?? "standard",
			timestampMod:
				options.timestampMod ?? this.context.settings?.timestampMod ?? 5,
		};
	}
}
