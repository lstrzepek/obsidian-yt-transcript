import YTranscriptPlugin from "src/main";
import { ItemView, WorkspaceLeaf, Menu } from "obsidian";
import {
	TranscriptResponse,
	YoutubeTranscript,
	YoutubeTranscriptError,
} from "./fetch-transcript";
import { formatTimestamp } from "./timestampt-utils";
import { getTranscriptBlocks, highlightText } from "./render-utils";
import { TranscriptBlock } from "./types";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";
export class TranscriptView extends ItemView {
	isDataLoaded: boolean;
	plugin: YTranscriptPlugin;

	loaderContainerEl?: HTMLElement;
	dataContainerEl?: HTMLElement;
	errorContainerEl?: HTMLElement;

	videoTitle?: string;
	videoData?: TranscriptResponse[] = [];

	constructor(leaf: WorkspaceLeaf, plugin: YTranscriptPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.isDataLoaded = false;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h4", { text: "Transcript" });
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

	/**
	 * Adds a div with loading text to the view content
	 */
	private renderLoader() {
		if (this.loaderContainerEl !== undefined) {
			this.loaderContainerEl.createEl("div", {
				text: "Loading...",
			});
		}
	}

	/**
	 * Adds a text input to the view content
	 */
	private renderSearchInput(
		url: string,
		data: TranscriptResponse,
		timestampMod: number
	) {
		const searchInputEl = this.contentEl.createEl("input");
		searchInputEl.type = "text";
		searchInputEl.placeholder = "Search...";
		searchInputEl.style.marginBottom = "20px";
		searchInputEl.addEventListener("input", (e) => {
			const searchFilter = (e.target as HTMLInputElement).value;
			this.renderTranscriptionBlocks(
				url,
				data,
				timestampMod,
				searchFilter
			);
		});
	}

	/**
	 * Adds a div with the video title to the view content
	 * @param title - the title of the video
	 */
	private renderVideoTitle(title: string) {
		const titleEl = this.contentEl.createEl("div");
		titleEl.innerHTML = title;
		titleEl.style.fontWeight = "bold";
		titleEl.style.marginBottom = "20px";
	}

	private formatContentToPaste(url: string, blocks: TranscriptBlock[]) {
		return blocks
			.map((block) => {
				const { quote, quoteTimeOffset } = block;
				const href = url + "&t=" + Math.floor(quoteTimeOffset / 1000);
				const formattedBlock = `[${formatTimestamp(
					quoteTimeOffset
				)}](${href}) ${quote}`;

				return formattedBlock;
			})
			.join("\n");
	}

	/**
	 * Add a transcription blocks to the view content
	 * @param url - the url of the video
	 * @param data - the transcript data
	 * @param timestampMod - the number of seconds between each timestamp
	 * @param searchValue - the value to search for in the transcript
	 */
	private renderTranscriptionBlocks(
		url: string,
		data: TranscriptResponse,
		timestampMod: number,
		searchValue: string
	) {
		const dataContainerEl = this.dataContainerEl;
		if (dataContainerEl !== undefined) {
			//Clear old data before rerendering
			dataContainerEl.empty();

			// TODO implement drag and drop
			// const handleDrag = (quote: string) => {
			// 	return (event: DragEvent) => {
			// 		event.dataTransfer?.setData("text/plain", quote);
			// 	};
			// };

			const transcriptBlocks = getTranscriptBlocks(
				data.lines,
				timestampMod
			);

			//Filter transcript blocks based on
			const filteredBlocks = transcriptBlocks.filter((block) =>
				block.quote.toLowerCase().includes(searchValue.toLowerCase())
			);

			filteredBlocks.forEach((block) => {
				const { quote, quoteTimeOffset } = block;
				const blockContainerEl = createEl("div", {
					cls: "yt-transcript__transcript-block",
				});

				const linkEl = createEl("a", {
					text: formatTimestamp(quoteTimeOffset),
					attr: {
						href: url + "&t=" + Math.floor(quoteTimeOffset / 1000),
					},
				});
				linkEl.style.marginBottom = "5px";

				const span = dataContainerEl.createEl("span", {
					text: quote,
					title: "Click to copy",
				});

				span.addEventListener("click", (event) => {
					const target = event.target as HTMLElement;
					if (target !== null) {
						navigator.clipboard.writeText(target.textContent ?? "");
					}
				});

				//Highlight any match search terms
				if (searchValue !== "") highlightText(span, searchValue);

				// TODO implement drag and drop
				// span.setAttr("draggable", "true");
				// span.addEventListener("dragstart", handleDrag(quote));

				blockContainerEl.appendChild(linkEl);
				blockContainerEl.appendChild(span);

				blockContainerEl.addEventListener(
					"contextmenu",
					(event: MouseEvent) => {
						const menu = new Menu();
						menu.addItem((item) =>
							item.setTitle("Copy all").onClick(() => {
								navigator.clipboard.writeText(
									this.formatContentToPaste(
										url,
										filteredBlocks
									)
								);
							})
						);
						menu.showAtPosition({
							x: event.clientX,
							y: event.clientY,
						});
					}
				);

				dataContainerEl.appendChild(blockContainerEl);
			});
		}
	}

	/**
	 * Sets the state of the view
	 * This is called when the view is loaded
	 */
	async setEphemeralState(state: { url: string }): Promise<void> {
		//If we switch to another view and then switch back, we don't want to reload the data
		if (this.isDataLoaded) return;

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
			//If it's the first time loading the view, initialize our containers
			//otherwise, clear the existing data for rerender
			if (this.loaderContainerEl === undefined) {
				this.loaderContainerEl = this.contentEl.createEl("div");
			} else {
				this.loaderContainerEl.empty();
			}

			//Clear all containers for rerender and render loader
			this.renderLoader();

			//Get the youtube video title and transcript at the same time
			const data = await YoutubeTranscript.fetchTranscript(url, {
				lang,
				country,
			});

			if (!data) throw Error();

			this.isDataLoaded = true;
			this.loaderContainerEl.empty();

			this.renderVideoTitle(data.title);
			this.renderSearchInput(url, data, timestampMod);

			if (this.dataContainerEl === undefined) {
				this.dataContainerEl = this.contentEl.createEl("div");
			} else {
				this.dataContainerEl.empty();
			}

			//If there was already an error clear it
			if (this.errorContainerEl !== undefined) {
				this.errorContainerEl.empty();
			}

			if (data.lines.length === 0) {
				this.dataContainerEl.createEl("h4", {
					text: "No transcript found",
				});
				this.dataContainerEl.createEl("div", {
					text: "Please check if video contains any transcript or try adjust language and country in plugin settings.",
				});
			} else {
				this.renderTranscriptionBlocks(url, data, timestampMod, "");
			}
		} catch (err: unknown) {
			let errorMessage = "";
			if (err instanceof YoutubeTranscriptError) {
				errorMessage = err.message;
			}

			this.loaderContainerEl?.empty();

			if (this.errorContainerEl === undefined) {
				this.errorContainerEl = this.contentEl.createEl("h5");
			} else {
				this.errorContainerEl.empty();
			}
			const titleEl = this.errorContainerEl.createEl("div", {
				text: "Error loading transcript",
			});
			titleEl.style.marginBottom = "5px";

			const messageEl = this.errorContainerEl.createEl("div", {
				text: errorMessage,
			});
			messageEl.style.color = "var(--text-muted)";
			messageEl.style.fontSize = "var(--font-ui-small)";
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
