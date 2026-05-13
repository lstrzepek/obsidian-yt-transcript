import { ItemView, Menu, Notice, WorkspaceLeaf, setIcon } from "obsidian";

import { getTranscriptBlocks } from "src/transcript/blocks";
import { formatTimestamp } from "src/transcript/timestamp";
import type { TranscriptBlock, TranscriptResponse } from "src/transcript/types";

import { highlightText } from "../highlight";
import type YTranscriptPlugin from "../plugin";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";

export class TranscriptView extends ItemView {
	plugin: YTranscriptPlugin;
	dataContainerEl?: HTMLElement;
	matchCountEl?: HTMLElement;
	videoTitle?: string;
	private currentUrl?: string;
	private currentData?: TranscriptResponse;
	private currentTimestampMod?: number;
	private currentSearch = "";

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
		this.currentUrl = url;
		this.currentData = transcript;
		this.currentTimestampMod = timestampMod;
		this.currentSearch = "";

		this.contentEl.empty();

		const headerEl = this.contentEl.createEl("div", {
			cls: "yt-transcript__header",
		});
		headerEl.createEl("div", {
			text: transcript.title,
			cls: "yt-transcript__video-title",
			attr: { title: transcript.title },
		});

		if (transcript.lines.length === 0) {
			this.contentEl.createEl("div", {
				text: "No transcript found for this video.",
				cls: "yt-transcript__empty",
			});
			return;
		}

		const actionsEl = headerEl.createEl("div", {
			cls: "yt-transcript__actions",
		});
		this.renderSearchInput(actionsEl, url, transcript, timestampMod);
		this.renderIntervalInput(actionsEl);
		this.renderCopyAllButton(actionsEl);

		this.matchCountEl = headerEl.createEl("div", {
			cls: "yt-transcript__match-count",
		});

		this.dataContainerEl = this.contentEl.createEl("div", {
			cls: "yt-transcript__blocks",
		});
		this.renderTranscriptionBlocks(url, transcript, timestampMod, "");
	}

	private renderSearchInput(
		parentEl: HTMLElement,
		url: string,
		data: TranscriptResponse,
		timestampMod: number,
	) {
		const wrapperEl = parentEl.createEl("div", {
			cls: "yt-transcript__search",
		});
		const iconEl = wrapperEl.createEl("span", {
			cls: "yt-transcript__search-icon",
		});
		setIcon(iconEl, "search");
		const searchInputEl = wrapperEl.createEl("input", {
			cls: "yt-transcript__search-input",
		});
		searchInputEl.type = "text";
		searchInputEl.placeholder = "Search transcript";
		searchInputEl.addEventListener("input", (e) => {
			const value = (e.target as HTMLInputElement).value;
			this.currentSearch = value;
			this.renderTranscriptionBlocks(url, data, timestampMod, value);
		});
	}

	private renderIntervalInput(parentEl: HTMLElement) {
		const wrapperEl = parentEl.createEl("label", {
			cls: "yt-transcript__interval",
			attr: { title: "Lines grouped per timestamp" },
		});
		wrapperEl.createEl("span", {
			text: "Every",
			cls: "yt-transcript__interval-label",
		});
		const input = wrapperEl.createEl("input", {
			cls: "yt-transcript__interval-input",
		});
		input.type = "number";
		input.min = "1";
		input.step = "1";
		input.value = String(this.currentTimestampMod ?? 5);
		input.addEventListener("change", async () => {
			const parsed = Number.parseInt(input.value, 10);
			if (Number.isNaN(parsed) || parsed < 1) {
				input.value = String(this.currentTimestampMod ?? 5);
				return;
			}
			this.currentTimestampMod = parsed;
			this.plugin.settings.timestampMod = parsed;
			await this.plugin.saveSettings();
			if (this.currentUrl && this.currentData) {
				this.renderTranscriptionBlocks(
					this.currentUrl,
					this.currentData,
					parsed,
					this.currentSearch,
				);
			}
		});
	}

	private renderCopyAllButton(parentEl: HTMLElement) {
		const btn = parentEl.createEl("button", {
			cls: "yt-transcript__copy-all clickable-icon",
			attr: { "aria-label": "Copy all", title: "Copy all" },
		});
		setIcon(btn, "copy");
		btn.addEventListener("click", () => this.copyAll());
	}

	private updateMatchCount(searchValue: string, count: number) {
		if (!this.matchCountEl) return;
		if (searchValue === "") {
			this.matchCountEl.setText("");
			this.matchCountEl.hide();
			return;
		}
		this.matchCountEl.show();
		this.matchCountEl.setText(
			count === 0
				? "No matches"
				: count === 1
					? "1 match"
					: `${count} matches`,
		);
	}

	private copyAll() {
		if (
			!this.currentUrl ||
			!this.currentData ||
			this.currentTimestampMod === undefined
		)
			return;
		const blocks = getTranscriptBlocks(
			this.currentData.lines,
			this.currentTimestampMod,
		).filter((block) =>
			block.quote
				.toLowerCase()
				.includes(this.currentSearch.toLowerCase()),
		);
		if (blocks.length === 0) return;
		navigator.clipboard.writeText(
			this.formatContentToPaste(this.currentUrl, blocks),
		);
		new Notice(
			this.currentSearch
				? `Copied ${blocks.length} matching blocks`
				: "Copied transcript",
		);
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

		this.updateMatchCount(searchValue, filteredBlocks.length);

		if (searchValue !== "" && filteredBlocks.length === 0) {
			dataContainerEl.createEl("div", {
				text: "No matches.",
				cls: "yt-transcript__empty",
			});
			return;
		}

		filteredBlocks.forEach((block) => {
			const { quote, quoteTimeOffset } = block;
			const blockContainerEl = createEl("div", {
				cls: "yt-transcript__transcript-block",
			});
			blockContainerEl.draggable = true;

			const timestampHref =
				url + "&t=" + Math.floor(quoteTimeOffset / 1000);
			const linkEl = createEl("a", {
				text: formatTimestamp(quoteTimeOffset),
				cls: "external-link",
				attr: {
					href: timestampHref,
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
