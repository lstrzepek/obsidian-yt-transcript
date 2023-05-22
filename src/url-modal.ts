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
		const title = contentEl.createEl("h4", {
			text: "Fetch Transcription From URL",
		});
		title.style.marginBottom = "10px";

		//Container
		const container = contentEl.createEl("div");
		container.style.display = "flex";
		container.style.flexDirection = "column";
		container.style.maxWidth = "350px";
		container.style.rowGap = "20px";

		//Input
		const inputContainer = container.createEl("div");
		inputContainer.style.display = "flex";
		inputContainer.style.flexDirection = "column";
		inputContainer.style.rowGap = "10px";

		const label = inputContainer.createEl("label", { text: "YouTube URL" });
		label.style.marginBottom = "5px";

		const input = inputContainer.createEl("input");
		input.onchange = (e) => {
			this.inputText = (e.target as HTMLInputElement).value;
		};

		//Button
		const button = container.createEl("button", { text: "Fetch" });
		button.style.cursor = "pointer";
		button.onclick = () => {
			if (isValidYoutubeURL(this.inputText)) {
				this.plugin.openView(this.inputText);
				this.close();
			} else {
				new Notice("Invalid YouTube URL");
			}
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
