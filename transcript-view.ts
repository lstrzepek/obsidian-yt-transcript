import YTranscriptPlugin from "main";
import { ItemView, WorkspaceLeaf, Menu } from "obsidian";
import YoutubeTranscript, { TranscriptResponse } from "youtube-transcript";
import {formatTimestamp} from "./timestampt-utils";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";
export class TranscriptView extends ItemView {
	plugin: YTranscriptPlugin;
	dataLoaded: boolean;
	constructor(leaf: WorkspaceLeaf, plugin: YTranscriptPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.dataLoaded = false;
	}

	getViewType(): string {
		return TRANSCRIPT_TYPE_VIEW;
	}
	getDisplayText(): string {
		return "Transcript";
	}
	getIcon(): string {
		return "scroll";
	}

	protected async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h4", { text: "Transcript" });
	}

	async setEphemeralState({ url, timestampMod, lang, country }: any): Promise<void> {
		if (this.dataLoaded)
			return;

		try {
			const data = await YoutubeTranscript.fetchTranscript(url, { lang, country });
			if (!data) {
				this.contentEl.empty();
				this.contentEl.createEl('h4', { text: "No transcript found" });
				this.contentEl.createEl('div', { text: "Please check if video contains any transcript or try adjust language and country in plugin settings." });
				return;
			}

			const handleDrag = (quote: string) => {
				return (event: DragEvent) => {
					event.dataTransfer?.setData('text/plain', quote);
				}
			};

			var quote = '';
			var quoteTimeOffset = 0;
			data.forEach((line, i) => {
				if (i === 0) {
					quoteTimeOffset = line.offset;
					quote += (line.text + ' ');
					return;
				}
				if (i % timestampMod == 0) {
					const div = createEl('div', { cls: "transcript-block" });

					const button = createEl('button', { cls: "timestamp", attr: { "data-timestamp": quoteTimeOffset.toFixed() } });
					const link = createEl('a', { text: formatTimestamp(quoteTimeOffset), attr: { "href": url + '&t=' + Math.floor(quoteTimeOffset / 1000) } });
					button.appendChild(link);

					const span = this.contentEl.createEl('span', { cls: "transcript-line", text: quote });
					span.setAttr('draggable', 'true');
					span.addEventListener('dragstart', handleDrag(quote));

					div.appendChild(button);
					div.appendChild(span);
					div.addEventListener('contextmenu', (event: MouseEvent) => {
						const menu = new Menu();
						menu.addItem((item) => item
							.setTitle('Copy all')
							.onClick(() => {
								navigator.clipboard.writeText(data.map(t => t.text).join(' '));
							}));
						menu.showAtPosition({ x: event.clientX, y: event.clientY });
					});
					this.contentEl.appendChild(div);

					quote = '';
					quoteTimeOffset = line.offset;
				}
				quote += (line.text + ' ');
			});
			this.dataLoaded = true;
		} catch (err) {
			this.contentEl.empty();
			this.contentEl.createEl('h4', { text: "Error" });
			this.contentEl.createEl('div', { text: err });
		}
	}
}
