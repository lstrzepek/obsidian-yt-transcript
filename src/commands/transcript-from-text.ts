import { Editor, MarkdownView, Plugin } from "obsidian";
import { BaseCommand, CommandDefinition } from "./base-command";
import { EditorExtensions } from "../obsidian/editor-extensions";

export class TranscriptFromTextCommand extends BaseCommand {
	constructor(
		protected plugin: Plugin,
		private openView: (url: string) => Promise<void>,
	) {
		super(plugin);
	}

	getDefinition(): CommandDefinition {
		return {
			id: "transcript-from-text",
			name: "Get YouTube transcript from selected url",
			editorCallback: (editor: Editor, _: MarkdownView) => {
				const url = EditorExtensions.getSelectedText(editor).trim();
				this.openView(url);
			},
		};
	}
}
