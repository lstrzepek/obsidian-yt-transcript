import { App, Modal, Notice } from "obsidian";
import YTranscriptPlugin from "./main";
import { isValidYoutubeURL } from "./url-utils";

export default class URLModal extends Modal {
	inputText: string;
	plugin: YTranscriptPlugin;

	constructor(app: App, plugin: YTranscriptPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;

		//Title
		const titleEl = contentEl.createEl("h4", {
			text: "Fetch Transcription From URL",
		});
		titleEl.style.marginBottom = "10px";

		//Container
		const containerEl = contentEl.createEl("div");
		containerEl.style.display = "flex";
		containerEl.style.flexDirection = "column";
		containerEl.style.maxWidth = "350px";
		containerEl.style.rowGap = "20px";

		//Input
		const inputContainerEl = containerEl.createEl("div");
		inputContainerEl.style.display = "flex";
		inputContainerEl.style.flexDirection = "column";
		inputContainerEl.style.rowGap = "10px";

		const labelEl = inputContainerEl.createEl("label", {
			text: "YouTube URL",
		});
		labelEl.style.marginBottom = "5px";

		const inputEl = inputContainerEl.createEl("input");
		inputEl.onchange = (e) => {
			this.inputText = (e.target as HTMLInputElement).value;
		};

		//Button
		const buttonEl = containerEl.createEl("button", { text: "Fetch" });
		buttonEl.style.cursor = "pointer";
		buttonEl.addEventListener("click", () => {
			if (isValidYoutubeURL(this.inputText)) {
				this.plugin.openView(this.inputText);
				this.close();
			} else {
				new Notice("Invalid YouTube URL");
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
