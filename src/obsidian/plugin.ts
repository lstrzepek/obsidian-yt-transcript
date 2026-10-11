import {
	App,
	Editor,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	type SettingDefinitionItem,
	type WorkspaceLeaf,
} from "obsidian";

import type { TranscriptResponse } from "src/transcript/types";
import { fetchTranscript } from "src/youtube/fetch";
import type { TranscriptConfig } from "src/youtube/types";

import { isValidYouTubeUrl } from "src/youtube/url";

import { InsertTranscriptCommand } from "./commands/insert-transcript";
import { getSelectedText } from "./editor-extensions";
import { obsidianHttp } from "./http";
import { PromptModal } from "./modals/prompt-modal";
import {
	applySettingValue,
	buildSettingDefinitions,
	DEFAULT_SETTINGS,
	isOpenLocation,
	isSettingKey,
	OPEN_LOCATION_OPTIONS,
	SETTING_TEXT,
	type YTranscriptSettings,
} from "./settings";
import { TRANSCRIPT_TYPE_VIEW, TranscriptView } from "./views/transcript-view";

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
			name: "Get YouTube transcript from selected URL",
			editorCallback: (editor: Editor) => {
				const url = getSelectedText(editor).trim();
				void this.openView(url);
			},
		});

		this.addCommand({
			id: "transcript-from-prompt",
			name: "Get YouTube transcript from URL prompt",
			callback: async () => {
				const prompt = new PromptModal(this.app);
				const url = await new Promise<string>((resolve) =>
					prompt.openAndGetValue(resolve, () => resolve("")),
				);
				if (url) {
					await this.openView(url);
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
			const leaf = this.getOpenLeaf();
			await leaf.setViewState({ type: TRANSCRIPT_TYPE_VIEW });
			await this.app.workspace.revealLeaf(leaf);
			leaf.setEphemeralState({ url, transcript });
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "Unknown error";
			new Notice(`Failed to fetch transcript: ${message}`);
		} finally {
			notice.hide();
		}
	}

	private getOpenLeaf(): WorkspaceLeaf {
		const { workspace } = this.app;
		switch (this.settings.openLocation) {
			case "left-sidebar":
				return workspace.getLeftLeaf(false)!;
			case "tab":
				return workspace.getLeaf("tab");
			case "split":
				return workspace.getLeaf("split", "vertical");
			case "right-sidebar":
			default:
				return workspace.getRightLeaf(false)!;
		}
	}

	async loadSettings() {
		const saved =
			(await this.loadData()) as Partial<YTranscriptSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...saved };
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

	// Obsidian 1.13+: renders the tab declaratively and makes every setting searchable.
	// When this returns a non-empty array, display() is never called.
	getSettingDefinitions(): SettingDefinitionItem[] {
		return buildSettingDefinitions();
	}

	getControlValue(key: string): unknown {
		return isSettingKey(key) ? this.plugin.settings[key] : undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (applySettingValue(this.plugin.settings, key, value)) {
			await this.plugin.saveSettings();
		}
	}

	// Fallback for Obsidian 1.7.2–1.12, which don't know getSettingDefinitions().
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(SETTING_TEXT.timestampMod.name)
			.setDesc(SETTING_TEXT.timestampMod.desc)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.timestampMod.toFixed())
					.onChange((value) =>
						this.setControlValue(
							"timestampMod",
							Number.parseInt(value, 10),
						),
					),
			);

		new Setting(containerEl)
			.setName(SETTING_TEXT.lang.name)
			.setDesc(SETTING_TEXT.lang.desc)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.lang)
					.setValue(this.plugin.settings.lang)
					.onChange((value) => this.setControlValue("lang", value)),
			);

		new Setting(containerEl)
			.setName(SETTING_TEXT.country.name)
			.setDesc(SETTING_TEXT.country.desc)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.country)
					.setValue(this.plugin.settings.country)
					.onChange((value) =>
						this.setControlValue("country", value),
					),
			);

		new Setting(containerEl)
			.setName(SETTING_TEXT.openLocation.name)
			.setDesc(SETTING_TEXT.openLocation.desc)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(OPEN_LOCATION_OPTIONS)
					.setValue(this.plugin.settings.openLocation)
					.onChange((value) => {
						if (isOpenLocation(value)) {
							void this.setControlValue("openLocation", value);
						}
					}),
			);
	}
}
