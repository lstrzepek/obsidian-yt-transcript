import YTranscriptPlugin from "../plugin";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { TranscriptResponse, YoutubeTranscriptError } from "../core/youtube-transcript";
import { getTranscriptBlocks } from "./render-utils";
import { TranscriptBlock } from "../types";
import { TranscriptDataService } from "./services/transcript-data-service";
import { TranscriptBlockRenderer } from "./services/transcript-block-renderer";
import { TranscriptUIRenderer } from "./services/transcript-ui-renderer";
import { TranscriptStateService, TranscriptViewState } from "./services/transcript-state-service";
import { ErrorHandlingService } from "./services/error-handling-service";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";

export class TranscriptView extends ItemView {
	plugin: YTranscriptPlugin;

	// Services
	private dataService: TranscriptDataService;
	private uiRenderer: TranscriptUIRenderer;
	private blockRenderer: TranscriptBlockRenderer;
	private stateService: TranscriptStateService;
	private errorHandler: ErrorHandlingService;

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
		this.stateService = new TranscriptStateService();
		this.errorHandler = new ErrorHandlingService();

		// Register state handlers (called automatically on transitions)
		this.stateService.onEnter(TranscriptViewState.LOADING, (context) =>
			this.handleLoadingState(context),
		);
		this.stateService.onEnter(TranscriptViewState.LOADED, (context) =>
			this.handleLoadedState(context),
		);
		this.stateService.onEnter(TranscriptViewState.ERROR, (context) =>
			this.handleErrorState(context),
		);
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
	 * Implements a state machine for clear state transitions
	 */
	async setEphemeralState(state: { url: string }): Promise<void> {
		// Guard: Check if already loaded
		if (this.stateService.isAlreadyLoaded()) {
			return;
		}

		const leafIndex = this.getLeafIndex();

		// Persist URL if provided
		if (state.url) {
			this.plugin.settings.leafUrls[leafIndex] = state.url;
			await this.plugin.saveSettings();
		}

		const url = this.plugin.settings.leafUrls[leafIndex];

		try {
			// Initialize containers
			this.ensureContainers();

			// Transition: IDLE → LOADING (handler auto-executes)
			await this.stateService.toLoading(url);

			// Load data from YouTube
			await this.dataService.loadTranscript(url, this.plugin.settings);

			// Check if data load was successful
			if (this.dataService.hasError()) {
				// Transition: LOADING → ERROR (handler auto-executes)
				const rawError = this.dataService.getError();
				if (rawError) {
					const appError = this.errorHandler.handleError(rawError);
					this.errorHandler.logError(appError);
					await this.stateService.toError(appError);
				}
			} else {
				// Transition: LOADING → LOADED (handler auto-executes)
				const data = this.dataService.getData();
				if (data) {
					await this.stateService.toLoaded(data);
				}
			}
		} catch (err: unknown) {
			// Handle unexpected errors
			const appError = this.errorHandler.handleError(err);
			this.errorHandler.logError(appError);
			// Transition: LOADING → ERROR (handler auto-executes)
			await this.stateService.toError(appError);
		}
	}

	/**
	 * Handler for LOADING state
	 * Displays loading UI
	 */
	private async handleLoadingState(context: { url?: string }): Promise<void> {
		this.uiRenderer.renderLoader(this.loaderContainerEl!);
	}

	/**
	 * Handler for LOADED state
	 * Displays transcript data
	 */
	private async handleLoadedState(context: { url?: string; data?: TranscriptResponse }): Promise<void> {
		const { url, data } = context;
		if (!url || !data) return;

		// Clear loading and error states
		this.uiRenderer.clear(this.loaderContainerEl!);
		this.uiRenderer.clear(this.errorContainerEl!);

		// Render title
		this.uiRenderer.renderVideoTitle(this.contentEl, data.title);

		// Render search input with callback
		this.uiRenderer.renderSearchInput(
			this.contentEl,
			(searchValue) => this.onSearchInputChange(url, data, searchValue),
		);

		// Render transcript blocks or empty state
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
	 * Handler for ERROR state
	 * Displays error message with user-friendly formatting
	 */
	private async handleErrorState(context: { error?: any }): Promise<void> {
		const { error } = context;
		if (!error) return;

		this.uiRenderer.clear(this.loaderContainerEl!);
		this.uiRenderer.renderError(this.errorContainerEl!, error);
	}

	/**
	 * Callback when search input changes
	 * Stays in LOADED state, just re-renders blocks
	 */
	private onSearchInputChange(
		url: string,
		data: TranscriptResponse,
		searchValue: string,
	): void {
		if (!this.stateService.is(TranscriptViewState.LOADED)) {
			return;
		}
		this.renderTranscriptionBlocks(url, data, searchValue);
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
