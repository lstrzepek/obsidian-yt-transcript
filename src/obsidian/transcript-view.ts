import YTranscriptPlugin from "../plugin";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { TranscriptResponse, YoutubeTranscriptError } from "../core/youtube-transcript";
import { getTranscriptBlocks } from "./render-utils";
import { TranscriptBlock } from "../types";
import { TranscriptDataService } from "./services/transcript-data-service";
import { TranscriptBlockRenderer } from "./services/transcript-block-renderer";
import { TranscriptUIRenderer } from "./services/transcript-ui-renderer";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";

export class TranscriptView extends ItemView {
	plugin: YTranscriptPlugin;

	// Services
	private dataService: TranscriptDataService;
	private uiRenderer: TranscriptUIRenderer;
	private blockRenderer: TranscriptBlockRenderer;

	// DOM containers
	loaderContainerEl?: HTMLElement;
	dataContainerEl?: HTMLElement;
	errorContainerEl?: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: YTranscriptPlugin) {
		super(leaf);
		this.plugin = plugin;

		// Initialize services
		this.dataService = new TranscriptDataService();
		this.uiRenderer = new TranscriptUIRenderer();
		this.blockRenderer = new TranscriptBlockRenderer({
			onCopy: () => {
				// Optional: add toast notification
			},
			onCopyAll: () => {
				// Optional: add toast notification
			},
		});
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
	 * Renders transcript blocks with optional search filtering
	 */
	private renderTranscriptionBlocks(
		url: string,
		data: TranscriptResponse,
		searchValue: string,
	): void {
		const dataContainerEl = this.dataContainerEl;
		if (!dataContainerEl) return;

		// Get filtered blocks
		const filteredBlocks = this.getCurrentFilteredBlocks(data, searchValue);

		// Render blocks using the block renderer service
		this.blockRenderer.renderBlocks(
			filteredBlocks,
			dataContainerEl,
			url,
			searchValue,
		);
	}

	/**
	 * Sets the state of the view
	 * This is called when the view is loaded
	 */
	async setEphemeralState(state: { url: string }): Promise<void> {
		// If we switch to another view and then switch back, we don't want to reload the data
		if (this.dataService.isDataLoaded()) return;

		const leafIndex = this.getLeafIndex();

		// The state.url is not null when we call setEphemeralState from the command
		// in this case, we will save the url to the settings for future lookup
		if (state.url) {
			this.plugin.settings.leafUrls[leafIndex] = state.url;
			await this.plugin.saveSettings();
		}

		const url = this.plugin.settings.leafUrls[leafIndex];

		try {
			// Initialize containers if needed
			this.ensureContainers();

			// Show loading state
			this.uiRenderer.renderLoader(this.loaderContainerEl!);

			// Load transcript data from YouTube
			await this.dataService.loadTranscript(url, this.plugin.settings);

			// Handle loading completion
			this.renderLoadedTranscript(url);
		} catch (err: unknown) {
			// Handle errors
			this.renderError();
		}
	}

	/**
	 * Ensures all required DOM containers exist
	 */
	private ensureContainers(): void {
		if (this.loaderContainerEl === undefined) {
			this.loaderContainerEl = this.contentEl.createEl("div");
		}
		if (this.dataContainerEl === undefined) {
			this.dataContainerEl = this.contentEl.createEl("div");
		}
		if (this.errorContainerEl === undefined) {
			this.errorContainerEl = this.contentEl.createEl("div");
		}
	}

	/**
	 * Renders the transcript after successful load
	 */
	private renderLoadedTranscript(url: string): void {
		const data = this.dataService.getData();
		if (!data) return;

		// Clear loader
		this.uiRenderer.clear(this.loaderContainerEl!);
		this.uiRenderer.clear(this.errorContainerEl!);

		// Render title
		this.uiRenderer.renderVideoTitle(this.contentEl, data.title);

		// Render search input
		this.uiRenderer.renderSearchInput(
			this.contentEl,
			(searchValue) => this.handleSearch(url, data, searchValue),
		);

		// Render transcript blocks or "no transcript" message
		if (data.lines.length === 0) {
			this.uiRenderer.renderNoTranscript(this.dataContainerEl!);
		} else {
			this.renderTranscriptionBlocks(url, data, "");
			this.blockRenderer.attachContextMenu(
				this.dataContainerEl!,
				this.getCurrentFilteredBlocks(data, ""),
				url,
			);
		}
	}

	/**
	 * Renders error state
	 */
	private renderError(): void {
		const error = this.dataService.getError();
		if (!error) return;

		this.uiRenderer.clear(this.loaderContainerEl!);
		this.uiRenderer.renderError(this.errorContainerEl!, error);
	}

	/**
	 * Handles search input and re-renders blocks
	 */
	private handleSearch(
		url: string,
		data: TranscriptResponse,
		searchValue: string,
	): void {
		this.renderTranscriptionBlocks(url, data, searchValue);
	}

	/**
	 * Gets filtered transcript blocks based on search value
	 */
	private getCurrentFilteredBlocks(
		data: TranscriptResponse,
		searchValue: string,
	): TranscriptBlock[] {
		const { timestampMod } = this.plugin.settings;
		const transcriptBlocks = getTranscriptBlocks(data.lines, timestampMod);

		return transcriptBlocks.filter((block) =>
			block.quote.toLowerCase().includes(searchValue.toLowerCase()),
		);
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
