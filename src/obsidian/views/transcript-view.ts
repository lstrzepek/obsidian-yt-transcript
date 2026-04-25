import { ItemView, Menu, WorkspaceLeaf } from "obsidian";

import { getTranscriptBlocks } from "src/transcript/blocks";
import { formatTimestamp } from "src/transcript/timestamp";
import type { TranscriptBlock, TranscriptResponse } from "src/transcript/types";

import { highlightText } from "../highlight";
import type YTranscriptPlugin from "../plugin";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";

export class TranscriptView extends ItemView {
	plugin: YTranscriptPlugin;
	dataContainerEl?: HTMLElement;
	videoTitle?: string;

	constructor(leaf: WorkspaceLeaf, plugin: YTranscriptPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	async onOpen() {
		this.contentEl.empty();
		this.contentEl.createEl("h4", { text: "Transcript" });
	}

	async setEphemeralState(state: {
		url?: string;
		transcript?: TranscriptResponse;
	}): Promise<void> {
		const { url, transcript } = state;
		if (!url || !transcript) return;

		const { timestampMod } = this.plugin.settings;
		this.videoTitle = transcript.title;

		this.contentEl.empty();

		const headerEl = this.contentEl.createEl("div", {
			cls: "yt-transcript__header",
		});
		headerEl.createEl("div", {
			text: transcript.title,
			cls: "yt-transcript__video-title",
		});
		const closeBtn = headerEl.createEl("button", {
			text: "×",
			cls: "yt-transcript__close-btn",
			title: "Close transcript",
		});
		closeBtn.addEventListener("click", () => this.leaf.detach());

		if (transcript.lines.length === 0) {
			this.contentEl.createEl("div", {
				text: "No transcript found for this video.",
			});
			return;
		}

		this.renderSearchInput(url, transcript, timestampMod);

		this.dataContainerEl = this.contentEl.createEl("div");
		this.renderTranscriptionBlocks(url, transcript, timestampMod, "");
	}

	private renderSearchInput(
		url: string,
		data: TranscriptResponse,
		timestampMod: number,
	) {
		const searchInputEl = this.contentEl.createEl("input", {
			cls: "yt-transcript__search-input",
		});
		searchInputEl.type = "text";
		searchInputEl.placeholder = "Search...";
		searchInputEl.addEventListener("input", (e) => {
			this.renderTranscriptionBlocks(
				url,
				data,
				timestampMod,
				(e.target as HTMLInputElement).value,
			);
		});
	}

	private formatContentToPaste(url: string, blocks: TranscriptBlock[]) {
		return blocks
			.map((block) => {
				const { quote, quoteTimeOffset } = block;
				const href = url + "&t=" + Math.floor(quoteTimeOffset / 1000);
				return `[${formatTimestamp(quoteTimeOffset)}](${href}) ${quote}`;
			})
			.join("\n");
	}

	private renderTranscriptionBlocks(
		url: string,
		data: TranscriptResponse,
		timestampMod: number,
		searchValue: string,
	) {
		const dataContainerEl = this.dataContainerEl;
		if (dataContainerEl === undefined) return;

		dataContainerEl.empty();

		const transcriptBlocks = getTranscriptBlocks(data.lines, timestampMod);
		const filteredBlocks = transcriptBlocks.filter((block) =>
			block.quote.toLowerCase().includes(searchValue.toLowerCase()),
		);

		filteredBlocks.forEach((block) => {
			const { quote, quoteTimeOffset } = block;
			const blockContainerEl = createEl("div", {
				cls: "yt-transcript__transcript-block",
			});
			blockContainerEl.draggable = true;

			const linkEl = createEl("a", {
				text: formatTimestamp(quoteTimeOffset),
				attr: {
					href: url + "&t=" + Math.floor(quoteTimeOffset / 1000),
				},
			});

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

			if (searchValue !== "") highlightText(span, searchValue);

			blockContainerEl.appendChild(linkEl);
			blockContainerEl.appendChild(span);

			blockContainerEl.addEventListener(
				"dragstart",
				(event: DragEvent) => {
					event.dataTransfer?.setData(
						"text/html",
						blockContainerEl.innerHTML,
					);
				},
			);

			blockContainerEl.addEventListener(
				"contextmenu",
				(event: MouseEvent) => {
					const menu = new Menu();
					menu.addItem((item) =>
						item.setTitle("Copy all").onClick(() => {
							navigator.clipboard.writeText(
								this.formatContentToPaste(url, filteredBlocks),
							);
						}),
					);
					menu.showAtPosition({ x: event.clientX, y: event.clientY });
				},
			);

			dataContainerEl.appendChild(blockContainerEl);
		});
	}

	getViewType(): string {
		return TRANSCRIPT_TYPE_VIEW;
	}
	getDisplayText(): string {
		return `Video: ${this.videoTitle ?? "No name"}`;
	}
	getIcon(): string {
		return "scroll";
	}
}
