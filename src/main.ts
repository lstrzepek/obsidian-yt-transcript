import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { TranscriptView, TRANSCRIPT_TYPE_VIEW } from "src/transcript-view";
import { EditorExtensions } from "../editor-extensions";
import URLModal from "./url-modal";

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
	settings: YTranscriptSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			TRANSCRIPT_TYPE_VIEW,
			(leaf) => new TranscriptView(leaf, this)
		);

		this.addCommand({
			id: "fetch-transcript-from-text",
			name: "Fetch transcription from selected text",
			editorCallback: (editor: Editor, _: MarkdownView) => {
				const url = EditorExtensions.getSelectedText(editor).trim();
				this.openView(url);
			},
		});

		this.addCommand({
			id: "fetch-transcript-from-url",
			name: "Fetch transcription from URL",
			callback: () => {
				new URLModal(this.app, this).open();
			},
		});

		this.addSettingTab(new YTranslateSettingTab(this.app, this));
	}

	async openView(url: string) {
		const leaf = this.app.workspace.getRightLeaf(false);
		await leaf.setViewState({
			type: TRANSCRIPT_TYPE_VIEW,
		});
		this.app.workspace.revealLeaf(leaf);
		leaf.setEphemeralState({
			url,
			timestampMod: this.settings.timestampMod,
			lang: this.settings.lang,
			country: this.settings.country,
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(TRANSCRIPT_TYPE_VIEW);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class YTranslateSettingTab extends PluginSettingTab {
	plugin: YTranscriptPlugin;
	values: Record<string, string>;

	/**
	 *
	 */
	constructor(app: App, plugin: YTranscriptPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "Settings for YTranslate" });

		new Setting(containerEl)
			.setName("Timestamp interval")
			.setDesc(
				"Indicates how often timestamp should occur in text (1 - every line, 10 - every 10 lines)"
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
					})
			);

		new Setting(containerEl)
			.setName("Language")
			.setDesc("Prefered transcript language")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.lang)
					.onChange(async (value) => {
						this.plugin.settings.lang = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Country")
			.setDesc("Prefered transcript country code")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.country)
					.onChange(async (value) => {
						this.plugin.settings.country = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
