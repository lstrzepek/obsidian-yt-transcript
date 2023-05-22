import YTranscriptPlugin from "src/main";
import { ItemView, WorkspaceLeaf, Menu } from "obsidian";
import { TranscriptResponse, YoutubeTranscript } from "youtube-transcript";
import { formatTimestamp } from "./timestampt-utils";
import { getYouTubeVideoTitle } from "./url-utils";
import { getTranscriptBlocks, highlightText } from "./render-utils";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";
export class TranscriptView extends ItemView {
	isDataLoaded: boolean;
	plugin: YTranscriptPlugin;

	loadingEl: HTMLElement;
	dataContainerEl: HTMLElement;

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
		contentEl.createEl("h4", { text: "YouTube Transcript" });
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
		this.loadingEl = this.contentEl.createEl("div", {
			text: "Loading...",
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

	/**
	 * Adds a text input to the view content
	 * @param title - the title of the video
	 */
	private renderSearchInput(
		url: string,
		data: TranscriptResponse[],
		timestampMod: number
	) {
		const searchInputEl = this.contentEl.createEl("input");
		searchInputEl.type = "text";
		searchInputEl.style.marginBottom = "10px";
		searchInputEl.placeholder = "Search transcript...";
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
	 * Add a transcription blocks to the view content
	 * @param url - the url of the video
	 * @param data - the transcript data
	 * @param timestampMod - the number of seconds between each timestamp
	 * @param searchValue - the value to search for in the transcript
	 */
	private renderTranscriptionBlocks(
		url: string,
		data: TranscriptResponse[],
		timestampMod: number,
		searchValue: string
	) {
		this.dataContainerEl.empty();

		const handleDrag = (quote: string) => {
			return (event: DragEvent) => {
				event.dataTransfer?.setData("text/plain", quote);
			};
		};

		const transcriptBlocks = getTranscriptBlocks(data, timestampMod);

		//Filter transcript blocks based on
		const filteredBlocks = transcriptBlocks.filter((block) =>
			block.quote.toLowerCase().includes(searchValue.toLowerCase())
		);

		filteredBlocks.forEach((block) => {
			const { quote, quoteTimeOffset } = block;
			const div = createEl("div", {
				cls: "yt-transcript__transcript-block",
			});

			const button = createEl("button", {
				cls: "yt-transcript__timestamp",
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
				text: quote,
			});

			//Highlight any match search terms
			if (searchValue !== "") highlightText(span, searchValue);

			// TODO implement drag and drop
			// span.setAttr("draggable", "true");
			// span.addEventListener("dragstart", handleDrag(quote));

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

	/**
	 * Sets the state of the view
	 * This is called when the view is loaded
	 */
	async setEphemeralState(state: any): Promise<void> {
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
			this.renderLoader();

			//Get the youtube video title and transcript at the same time
			const [videoTitle, data] = await Promise.all([
				getYouTubeVideoTitle(url),
				YoutubeTranscript.fetchTranscript(url, {
					lang,
					country,
				}),
			]);

			this.isDataLoaded = true;

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

			this.renderTranscriptionBlocks(url, data, timestampMod, "");
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
