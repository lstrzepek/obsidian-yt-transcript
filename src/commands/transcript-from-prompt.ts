import { Plugin } from "obsidian";
import { BaseCommand, CommandDefinition } from "./base-command";
import { PromptModal } from "../obsidian/prompt-modal";

export class TranscriptFromPromptCommand extends BaseCommand {
	constructor(
		protected plugin: Plugin,
		private openView: (url: string) => Promise<void>,
	) {
		super(plugin);
	}

	getDefinition(): CommandDefinition {
		return {
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
		};
	}
}
