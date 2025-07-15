import { Editor } from "obsidian";
import { URLDetector } from "../url-detection";
import { TranscriptFormatter, FormatTemplate, FormatOptions } from "../transcript-formatter";
import { YoutubeTranscript } from "../youtube-transcript";
import { PromptModal } from "../prompt-modal";
import { EditorExtensions } from "../../editor-extensions";
import { TranscriptConfig } from "../types";

export interface InsertTranscriptOptions {
	template?: FormatTemplate;
	timestampMod?: number;
}

export class InsertTranscriptCommand {
	constructor(private plugin: any) {}

	/**
	 * Executes the insert transcript command with default settings
	 */
	async execute(editor: Editor): Promise<void> {
		await this.executeWithOptions(editor, {});
	}

	/**
	 * Executes the insert transcript command with custom options
	 */
	async executeWithOptions(editor: Editor, options: InsertTranscriptOptions): Promise<void> {
		try {
			// Get YouTube URL with user confirmation
			const url = await this.getYouTubeUrlWithConfirmation(editor);
			if (!url) {
				return; // User cancelled or no URL found
			}

			// Validate URL
			if (!URLDetector.isValidYouTubeUrl(url)) {
				return; // Invalid YouTube URL
			}

			// Fetch transcript
			const transcriptConfig = this.createTranscriptConfig();
			const transcript = await YoutubeTranscript.getTranscript(url, transcriptConfig);
			
			// Validate transcript
			if (!transcript || !transcript.lines || transcript.lines.length === 0) {
				return; // No transcript available
			}

			// Format transcript
			const formatOptions = this.mergeFormatOptions(options);
			const formattedContent = TranscriptFormatter.format(transcript, url, formatOptions);
			
			// Validate formatted content
			if (!formattedContent || formattedContent.trim().length === 0) {
				return; // Nothing to insert
			}

			// Insert at cursor position
			const cursor = editor.getCursor();
			editor.replaceRange(formattedContent, cursor);

		} catch (error) {
			// Silently fail - errors are expected (network issues, no transcript, etc.)
			console.error("Insert transcript failed:", error);
		}
	}

	/**
	 * Gets YouTube URL with user confirmation via prompt
	 * Always shows prompt, but pre-populates with detected URL
	 */
	private async getYouTubeUrlWithConfirmation(editor: Editor): Promise<string | null> {
		// Try to detect URL from selection first, then clipboard
		const detectedUrl = await this.detectYouTubeUrl(editor);
		
		// Always show prompt, but pre-populate with detected URL
		try {
			const prompt = new PromptModal(detectedUrl || undefined);
			const userUrl = await new Promise<string>((resolve, reject) => {
				prompt.openAndGetValue(resolve, reject);
			});
			
			// Return the user's input (might be same as detected, or user might have changed it)
			return userUrl.trim() || null;
		} catch (error) {
			// User cancelled
			return null;
		}
	}

	/**
	 * Detects YouTube URL from selection or clipboard (for pre-populating prompt)
	 */
	private async detectYouTubeUrl(editor: Editor): Promise<string | null> {
		// 1. Try to get URL from selection
		const selectionUrl = this.getUrlFromSelection(editor);
		if (selectionUrl) {
			return selectionUrl;
		}

		// 2. Try to get URL from clipboard
		const clipboardUrl = await this.getUrlFromClipboard();
		if (clipboardUrl) {
			return clipboardUrl;
		}

		// 3. No URL detected
		return null;
	}

	/**
	 * Gets URL from current editor selection
	 */
	private getUrlFromSelection(editor: Editor): string | null {
		try {
			const selectedText = editor.somethingSelected() 
				? editor.getSelection()
				: EditorExtensions.getSelectedText(editor);
			
			return URLDetector.extractYouTubeUrlFromText(selectedText);
		} catch (error) {
			return null;
		}
	}

	/**
	 * Gets URL from system clipboard
	 */
	private async getUrlFromClipboard(): Promise<string | null> {
		try {
			const clipboardText = await navigator.clipboard.readText();
			return URLDetector.extractYouTubeUrlFromText(clipboardText);
		} catch (error) {
			// Clipboard access might be denied
			return null;
		}
	}

	/**
	 * Creates transcript config from plugin settings
	 */
	private createTranscriptConfig(): TranscriptConfig {
		return {
			lang: this.plugin.settings?.lang,
			country: this.plugin.settings?.country
		};
	}

	/**
	 * Merges user options with plugin settings
	 */
	private mergeFormatOptions(options: InsertTranscriptOptions): FormatOptions {
		return {
			template: options.template || FormatTemplate.STANDARD,
			timestampMod: options.timestampMod || this.plugin.settings?.timestampMod || 5
		};
	}
}