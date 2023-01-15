import { App, Editor, MarkdownView, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TranscriptView, TRANSCRIPT_TYPE_VIEW } from 'transcript-view';

interface YTranscriptSettings {
  timestampMod: number;
  lang: string;
  country: string;
}

const DEFAULT_SETTINGS: YTranscriptSettings = {
  timestampMod: 32,
  lang: 'en',
  country: 'EN'
}

export default class YTranscript extends Plugin {
  settings: YTranscriptSettings;

  async onload() {
    await this.loadSettings();

    this.registerView(TRANSCRIPT_TYPE_VIEW,
      (leaf) => new TranscriptView(leaf));

    this.addCommand({
      id: 'fetch-transcript',
      name: "Fetch transcription",
      editorCallback: (editor: Editor, _: MarkdownView) => {
        const url = editor.getSelection().trim();
        this.openView(url);
      }
    });

    this.addSettingTab(new YTranslateSettingTab(this.app, this));
  }

  async openView(url: string) {
    const leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({
      type: TRANSCRIPT_TYPE_VIEW
    });
    this.app.workspace.revealLeaf(leaf);
    leaf.setEphemeralState({
      url,
      timestampMod: this.settings.timestampMod,
      lang: this.settings.lang,
      country: this.settings.country
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(TRANSCRIPT_TYPE_VIEW);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class YTranslateSettingTab extends PluginSettingTab {
  plugin: YTranscript;
  values: Record<string, string>;


  /**
   *
   */
  constructor(app: App, plugin: YTranscript) {
    super(app, plugin);
    this.plugin = plugin;
    const v = [...Array(99).keys()];
    this.values = v.reduce((acc, item) => (acc[item.toFixed()] = item.toFixed(), acc), {} as Record<string, string>);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Settings for YTranslate' });

    new Setting(containerEl)
      .setName('Timestamp mod')
      .setDesc('Indicates how often timestamp should occure in text (1 - every line, 10 - every 10 lines)')
      .addDropdown(v => v
        .addOptions(this.values)
        .setValue(this.values['32'])
        .onChange(async (value) => {
          console.log('Timestamp:' + value);
          this.plugin.settings.timestampMod = Number.parseInt(value);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Language')
      .setDesc('Prefered transcript language')
      .addText(text => text
        .setValue(this.plugin.settings.lang)
        .onChange(async (value) => {
          this.plugin.settings.lang = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Country')
      .setDesc('Prefered transcript country code')
      .addText(text => text
        .setValue(this.plugin.settings.country)
        .onChange(async (value) => {
          this.plugin.settings.country = value;
          await this.plugin.saveSettings();
        }));

  }
}
