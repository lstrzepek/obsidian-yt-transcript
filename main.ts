import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TranscriptView, TRANSCRIPT_TYPE_VIEW } from 'transcript-view';

export default class YTranscript extends Plugin {

  async onload() {
    this.registerView(TRANSCRIPT_TYPE_VIEW,
      (leaf) => new TranscriptView(leaf));

    this.addCommand({
      id: 'fetch-transcript',
      name: "Fetch transcription",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        const url = editor.getSelection().trim();
        this.openView(url);
      }
    })
  }

  async openView(url: string) {
    const leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({
      type: TRANSCRIPT_TYPE_VIEW
    });
    this.app.workspace.revealLeaf(leaf);
    leaf.setEphemeralState({
      url
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(TRANSCRIPT_TYPE_VIEW);
  }
}
