import {
	Editor,
	MarkdownView,
	Plugin,
} from "obsidian";
import { TranscriptView, TRANSCRIPT_TYPE_VIEW } from "./obsidian/transcript-view";
import { PromptModal } from "./obsidian/prompt-modal";
import { EditorExtensions } from "./obsidian/editor-extensions";
import { InsertTranscriptCommand } from "./commands/insert-transcript";
import { YTranslateSettingTab } from "./obsidian/settings-tab";
import { DEFAULT_SETTINGS } from "./settings";
import type { YTranscriptSettings } from "./settings";

export default class YTranscriptPlugin extends Plugin {
	settings: YTranscriptSettings;
	private insertTranscriptCommand: InsertTranscriptCommand;

	async onload() {
		await this.loadSettings();

		// Initialize commands
		this.insertTranscriptCommand = new InsertTranscriptCommand(this);

		this.registerView(
			TRANSCRIPT_TYPE_VIEW,
			(leaf) => new TranscriptView(leaf, this),
		);

		this.addCommand({
			id: "transcript-from-text",
			name: "Get YouTube transcript from selected url",
			editorCallback: (editor: Editor, _: MarkdownView) => {
				const url = EditorExtensions.getSelectedText(editor).trim();
				this.openView(url);
			},
		});

		this.addCommand({
			id: "transcript-from-prompt",
			name: "Get YouTube transcript from url prompt",
			callback: async () => {
				const prompt = new PromptModal();
				const url: string = await new Promise((resolve) =>
					prompt.openAndGetValue(resolve, () => {}),
				);
				if (url) {
					this.openView(url);
				}
			},
		});

		// New mobile-first command
		this.addCommand({
			id: "insert-youtube-transcript",
			name: "Insert YouTube transcript",
			editorCallback: async (editor: Editor, _: MarkdownView) => {
				await this.insertTranscriptCommand.execute(editor);
			},
		});

		this.addSettingTab(new YTranslateSettingTab(this.app, this));
	}

	async openView(url: string) {
		const leaf = this.app.workspace.getRightLeaf(false)!;
		await leaf.setViewState({
			type: TRANSCRIPT_TYPE_VIEW,
		});
		this.app.workspace.revealLeaf(leaf);
		leaf.setEphemeralState({
			url,
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(TRANSCRIPT_TYPE_VIEW);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
