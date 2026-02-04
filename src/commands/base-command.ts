import { Plugin } from "obsidian";

export interface CommandDefinition {
	id: string;
	name: string;
	callback?: () => void | Promise<void>;
	editorCallback?: (editor: any, view: any) => void | Promise<void>;
}

export abstract class BaseCommand {
	constructor(protected plugin: Plugin) {}

	abstract getDefinition(): CommandDefinition;

	register() {
		this.plugin.addCommand(this.getDefinition());
	}
}
