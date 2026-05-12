import {
	App,
	Editor,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

import type { TranscriptResponse } from "src/transcript/types";
import { fetchTranscript } from "src/youtube/fetch";
import type { TranscriptConfig } from "src/youtube/types";

import { isValidYouTubeUrl } from "src/youtube/url";

import { InsertTranscriptCommand } from "./commands/insert-transcript";
import { getSelectedText } from "./editor-extensions";
import { obsidianHttp } from "./http";
import { PromptModal } from "./modals/prompt-modal";
import { TRANSCRIPT_TYPE_VIEW, TranscriptView } from "./views/transcript-view";

interface YTranscriptSettings {
	timestampMod: number;
	lang: string;
	country: string;
}

const DEFAULT_SETTINGS: YTranscriptSettings = {
	timestampMod: 5,
	lang: "en",
	country: "EN",
};

export default class YTranscriptPlugin extends Plugin {
	settings!: YTranscriptSettings;
	private insertTranscriptCommand!: InsertTranscriptCommand;

	async onload() {
		await this.loadSettings();

		this.insertTranscriptCommand = new InsertTranscriptCommand(this);

		this.registerView(
			TRANSCRIPT_TYPE_VIEW,
			(leaf) => new TranscriptView(leaf, this),
		);

		this.addCommand({
			id: "transcript-from-text",
			name: "Get YouTube transcript from selected url",
			editorCallback: (editor: Editor) => {
				const url = getSelectedText(editor).trim();
				this.openView(url);
			},
		});

		this.addCommand({
			id: "transcript-from-prompt",
			name: "Get YouTube transcript from url prompt",
			callback: async () => {
				const prompt = new PromptModal(this.app);
				const url: string = await new Promise((resolve) =>
					prompt.openAndGetValue(resolve, () => {}),
				);
				if (url) {
					this.openView(url);
				}
			},
		});

		this.addCommand({
			id: "insert-youtube-transcript",
			name: "Insert YouTube transcript",
			editorCallback: async (editor: Editor) => {
				await this.insertTranscriptCommand.execute(editor);
			},
		});

		this.addSettingTab(new YTranscriptSettingTab(this.app, this));
	}

	async getTranscript(
		url: string,
		config?: Partial<TranscriptConfig>,
	): Promise<TranscriptResponse> {
		return fetchTranscript(url, obsidianHttp, {
			lang: config?.lang ?? this.settings.lang,
			country: config?.country ?? this.settings.country,
		});
	}

	async openView(url: string) {
		if (!url) {
			new Notice("No YouTube URL provided.");
			return;
		}
		if (!isValidYouTubeUrl(url)) {
			new Notice("Not a valid YouTube URL.");
			return;
		}

		const notice = new Notice("Fetching transcript…", 0);
		try {
			const transcript = await this.getTranscript(url);
			const leaf = this.app.workspace.getRightLeaf(false)!;
			await leaf.setViewState({ type: TRANSCRIPT_TYPE_VIEW });
			this.app.workspace.revealLeaf(leaf);
			leaf.setEphemeralState({ url, transcript });
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Unknown error";
			new Notice(`Failed to fetch transcript: ${message}`);
		} finally {
			notice.hide();
		}
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

class YTranscriptSettingTab extends PluginSettingTab {
	plugin: YTranscriptPlugin;

	constructor(app: App, plugin: YTranscriptPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Settings for YTranscript" });

		new Setting(containerEl)
			.setName("Timestamp interval")
			.setDesc(
				"Indicates how often timestamp should occur in text (1 - every line, 10 - every 10 lines)",
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.timestampMod.toFixed())
					.onChange(async (value) => {
						const v = Number.parseInt(value);
						this.plugin.settings.timestampMod = Number.isNaN(v)
							? 5
							: v;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Language")
			.setDesc("Preferred transcript language")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.lang)
					.onChange(async (value) => {
						this.plugin.settings.lang = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Country")
			.setDesc("Preferred transcript country code")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.country)
					.onChange(async (value) => {
						this.plugin.settings.country = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
