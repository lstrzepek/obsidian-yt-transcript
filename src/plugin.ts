import {
	Editor,
	MarkdownView,
	Plugin,
} from "obsidian";
import { TranscriptView, TRANSCRIPT_TYPE_VIEW } from "./obsidian/transcript-view";
import { EditorExtensions } from "./obsidian/editor-extensions";
import { InsertTranscriptCommand } from "./commands/insert-transcript";
import { TranscriptFromTextCommand } from "./commands/transcript-from-text";
import { TranscriptFromPromptCommand } from "./commands/transcript-from-prompt";
import { YTranslateSettingTab } from "./obsidian/settings-tab";
import { DEFAULT_SETTINGS } from "./settings";
import type { YTranscriptSettings } from "./settings";

export default class YTranscriptPlugin extends Plugin {
	settings: YTranscriptSettings;
	private insertTranscriptCommand: InsertTranscriptCommand;
	private transcriptFromTextCommand: TranscriptFromTextCommand;
	private transcriptFromPromptCommand: TranscriptFromPromptCommand;

	async onload() {
		await this.loadSettings();

		// Initialize commands
		this.insertTranscriptCommand = new InsertTranscriptCommand(this);
		this.transcriptFromTextCommand = new TranscriptFromTextCommand(
			this,
			(url: string) => this.openView(url),
		);
		this.transcriptFromPromptCommand = new TranscriptFromPromptCommand(
			this,
			(url: string) => this.openView(url),
		);

		this.registerView(
			TRANSCRIPT_TYPE_VIEW,
			(leaf) => new TranscriptView(leaf, this),
		);

		// Register all commands
		this.insertTranscriptCommand.register();
		this.transcriptFromTextCommand.register();
		this.transcriptFromPromptCommand.register();

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
