import YTranscriptPlugin from "src/main";
import { ItemView, WorkspaceLeaf, Menu } from "obsidian";
import { TranscriptResponse, YoutubeTranscript } from "youtube-transcript";
import { formatTimestamp } from "./timestampt-utils";
import { getYouTubeVideoTitle } from "./url-utils";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";
export class TranscriptView extends ItemView {
	plugin: YTranscriptPlugin;
	loadingEl: HTMLElement;
	dataContainerEl: HTMLElement;
	videoTitle?: string;
	videoData?: TranscriptResponse[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: YTranscriptPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h4", { text: "YouTube Transcript" });
		this.loadingEl = contentEl.createEl("div", { text: "Loading..." });
	}

	async onClose() {
		const leafIndex = this.getLeafIndex();
		this.plugin.settings.leafUrls.splice(leafIndex, 1);
	}

	/**
	 * Gets the leaf index out of all of the open leaves
	 * This assumes that the leaf order shouldn't changed, which is a fair assumption
	 */
	private getLeafIndex(): number {
		const leaves = this.app.workspace.getLeavesOfType(TRANSCRIPT_TYPE_VIEW);
		return leaves.findIndex((leaf) => leaf === this.leaf);
	}

	private renderVideoTitle(videoTitle: string) {
		const titleEl = this.contentEl.createEl("div");
		titleEl.innerHTML = videoTitle;
		titleEl.style.fontWeight = "bold";
		titleEl.style.marginBottom = "20px";
	}

	private renderSearchInput(
		url: string,
		data: TranscriptResponse[],
		timestampMod: number
	) {
		const searchInputEl = this.contentEl.createEl("input");
		searchInputEl.type = "text";
		searchInputEl.placeholder = "Search transcript...";
		searchInputEl.oninput = (e) => {
			const searchFilter = (e.target as HTMLInputElement).value;
			this.renderTranscriptData(url, data, timestampMod, searchFilter);
		};
	}

	private renderTranscriptData(
		url: string,
		data: TranscriptResponse[],
		timestampMod: number,
		searchFilter: string
	) {
		this.dataContainerEl.empty();

		const handleDrag = (quote: string) => {
			return (event: DragEvent) => {
				event.dataTransfer?.setData("text/plain", quote);
			};
		};

		const transcriptBlocks: {
			quote: string;
			quoteTimeOffset: number;
		}[] = [];

		//Convert data into blocks
		var quote = "";
		var quoteTimeOffset = 0;
		data.forEach((line, i) => {
			if (i === 0) {
				quoteTimeOffset = line.offset;
				quote += line.text + " ";
				return;
			}
			if (i % timestampMod == 0) {
				transcriptBlocks.push({
					quote,
					quoteTimeOffset,
				});

				//Clear the data
				quote = "";
				quoteTimeOffset = line.offset;
			}
			quote += line.text + " ";
		});

		if (quote !== "") {
			transcriptBlocks.push({
				quote,
				quoteTimeOffset,
			});
		}

		transcriptBlocks
			.filter((block) =>
				block.quote.toLowerCase().includes(searchFilter.toLowerCase())
			)
			.forEach((block) => {
				const { quote, quoteTimeOffset } = block;
				const div = createEl("div", {
					cls: "transcript-block",
				});

				const button = createEl("button", {
					cls: "timestamp",
					attr: {
						"data-timestamp": quoteTimeOffset.toFixed(),
					},
				});
				const link = createEl("a", {
					text: formatTimestamp(quoteTimeOffset),
					attr: {
						href: url + "&t=" + Math.floor(quoteTimeOffset / 1000),
					},
				});
				button.appendChild(link);

				const span = this.dataContainerEl.createEl("span", {
					cls: "transcript-line",
					text: quote,
				});
				span.setAttr("draggable", "true");
				span.addEventListener("dragstart", handleDrag(quote));

				div.appendChild(button);
				div.appendChild(span);
				div.addEventListener("contextmenu", (event: MouseEvent) => {
					const menu = new Menu();
					menu.addItem((item) =>
						item.setTitle("Copy all").onClick(() => {
							navigator.clipboard.writeText(
								data.map((t) => t.text).join(" ")
							);
						})
					);
					menu.showAtPosition({
						x: event.clientX,
						y: event.clientY,
					});
				});
				this.dataContainerEl.appendChild(div);
			});
	}

	async setEphemeralState(state: any): Promise<void> {
		const leafIndex = this.getLeafIndex();

		//The state.url is not null when we call setEphermeralState from the command
		//in this case, we will save the url to the settings for future look up
		if (state.url) {
			this.plugin.settings.leafUrls[leafIndex] = state.url;
			await this.plugin.saveSettings();
		}

		const { lang, country, timestampMod, leafUrls } = this.plugin.settings;
		const url = leafUrls[leafIndex];

		try {
			//Get the youtube video title and transcript at the same time
			const [videoTitle, data] = await Promise.all([
				getYouTubeVideoTitle(url),
				YoutubeTranscript.fetchTranscript(url, {
					lang,
					country,
				}),
			]);

			this.loadingEl.detach();
			this.renderVideoTitle(videoTitle);
			this.renderSearchInput(url, data, timestampMod);

			this.dataContainerEl = this.contentEl.createEl("div");

			if (data.length === 0) {
				this.dataContainerEl.createEl("h4", {
					text: "No transcript found",
				});
				this.dataContainerEl.createEl("div", {
					text: "Please check if video contains any transcript or try adjust language and country in plugin settings.",
				});
				return;
			}

			this.renderTranscriptData(url, data, timestampMod, "");
		} catch (err) {
			console.log(err);
			const errorContainer = this.contentEl.createEl("div");
			errorContainer.createEl("h4", { text: "Error" });
			errorContainer.createEl("div", { text: err });
		}
	}

	getViewType(): string {
		return TRANSCRIPT_TYPE_VIEW;
	}
	getDisplayText(): string {
		return "YouTube Transcript";
	}
	getIcon(): string {
		return "scroll";
	}
}
