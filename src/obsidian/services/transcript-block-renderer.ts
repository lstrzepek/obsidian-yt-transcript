import { Menu } from "obsidian";
import { TranscriptBlock } from "../../types";
import { formatTimestamp } from "../../utils/timestampt-utils";
import { highlightText } from "../render-utils";

export interface BlockRendererOptions {
	onCopy?: (content: string) => void;
	onCopyAll?: (content: string) => void;
}

/**
 * Service responsible for rendering transcript blocks to the DOM
 * Handles block creation, event listeners, and interactions
 */
export class TranscriptBlockRenderer {
	constructor(private options: BlockRendererOptions = {}) {}

	/**
	 * Renders a single transcript block to the given container
	 * @param block - The transcript block to render
	 * @param container - The DOM element to append the block to
	 * @param url - The YouTube URL for generating clickable timestamp links
	 * @param searchValue - Current search filter to highlight matches
	 */
	renderBlock(
		block: TranscriptBlock,
		container: HTMLElement,
		url: string,
		searchValue: string,
	): void {
		const { quote, quoteTimeOffset } = block;
		const blockContainerEl = document.createElement("div");
		blockContainerEl.addClass("yt-transcript__transcript-block");
		blockContainerEl.draggable = true;

		// Create timestamp link
		const linkEl = document.createElement("a");
		linkEl.textContent = formatTimestamp(quoteTimeOffset);
		linkEl.href = url + "&t=" + Math.floor(quoteTimeOffset / 1000);
		linkEl.style.marginBottom = "5px";

		// Create quote text
		const span = document.createElement("span");
		span.textContent = quote;
		span.title = "Click to copy";

		// Add click handler for copying
		span.addEventListener("click", (event) => {
			const target = event.target as HTMLElement;
			if (target?.textContent) {
				navigator.clipboard.writeText(target.textContent);
				this.options.onCopy?.(target.textContent);
			}
		});

		// Highlight search matches
		if (searchValue !== "") {
			highlightText(span, searchValue);
		}

		blockContainerEl.appendChild(linkEl);
		blockContainerEl.appendChild(span);

		// Add drag handler
		blockContainerEl.addEventListener("dragstart", (event: DragEvent) => {
			event.dataTransfer?.setData("text/html", blockContainerEl.innerHTML);
		});

		container.appendChild(blockContainerEl);
	}

	/**
	 * Renders all transcript blocks to a container
	 * @param blocks - Array of transcript blocks to render
	 * @param container - DOM element to append blocks to
	 * @param url - YouTube URL for links
	 * @param searchValue - Search filter for highlighting
	 */
	renderBlocks(
		blocks: TranscriptBlock[],
		container: HTMLElement,
		url: string,
		searchValue: string,
	): void {
		container.empty();

		blocks.forEach((block) => {
			this.renderBlock(block, container, url, searchValue);
		});
	}

	/**
	 * Adds a context menu to a container for copying all blocks
	 * @param container - Container element to add menu to
	 * @param blocks - Array of all transcript blocks
	 * @param url - YouTube URL
	 */
	attachContextMenu(
		container: HTMLElement,
		blocks: TranscriptBlock[],
		url: string,
	): void {
		container.addEventListener("contextmenu", (event: MouseEvent) => {
			const menu = new Menu();
			menu.addItem((item) =>
				item.setTitle("Copy all").onClick(() => {
					const content = this.formatBlocksForPaste(blocks, url);
					navigator.clipboard.writeText(content);
					this.options.onCopyAll?.(content);
				}),
			);
			menu.showAtPosition({
				x: event.clientX,
				y: event.clientY,
			});
		});
	}

	/**
	 * Formats blocks as markdown for pasting
	 * @param blocks - Array of transcript blocks
	 * @param url - YouTube URL
	 */
	private formatBlocksForPaste(blocks: TranscriptBlock[], url: string): string {
		return blocks
			.map((block) => {
				const { quote, quoteTimeOffset } = block;
				const href = url + "&t=" + Math.floor(quoteTimeOffset / 1000);
				const formattedBlock = `[${formatTimestamp(
					quoteTimeOffset,
				)}](${href}) ${quote}`;
				return formattedBlock;
			})
			.join("\n");
	}
}
