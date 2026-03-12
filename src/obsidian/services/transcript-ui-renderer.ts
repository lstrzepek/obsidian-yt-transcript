import { YoutubeTranscriptError } from "../../core/youtube-transcript";
import { AppError } from "./error-handling-service";

/**
 * Service responsible for rendering UI elements (headers, loaders, errors)
 * Handles all non-transcript-block DOM manipulations
 */
export class TranscriptUIRenderer {
	/**
	 * Renders the loading state
	 * @param container - Container to append loader to
	 */
	renderLoader(container: HTMLElement): void {
		container.empty();
		container.createEl("div", {
			text: "Loading...",
		});
	}

	/**
	 * Renders the video title
	 * @param container - Container to append title to
	 * @param title - The video title to display
	 */
	renderVideoTitle(container: HTMLElement, title: string): void {
		const titleEl = container.createEl("div");
		titleEl.innerHTML = title;
		titleEl.style.fontWeight = "bold";
		titleEl.style.marginBottom = "20px";
	}

	/**
	 * Renders the search input field
	 * @param container - Container to append search input to
	 * @param onSearch - Callback when search value changes
	 */
	renderSearchInput(
		container: HTMLElement,
		onSearch: (searchValue: string) => void,
	): void {
		const searchInputEl = container.createEl("input");
		searchInputEl.type = "text";
		searchInputEl.placeholder = "Search...";
		searchInputEl.style.marginBottom = "20px";

		searchInputEl.addEventListener("input", (e) => {
			const searchFilter = (e.target as HTMLInputElement).value;
			onSearch(searchFilter);
		});
	}

	/**
	 * Renders "no transcript found" message
	 * @param container - Container to append message to
	 */
	renderNoTranscript(container: HTMLElement): void {
		container.empty();
		container.createEl("h4", {
			text: "No transcript found",
		});
		container.createEl("div", {
			text: "Please check if video contains any transcript or try adjust language and country in plugin settings.",
		});
	}

	/**
	 * Renders an error state
	 * Handles both YoutubeTranscriptError and AppError
	 * @param container - Container to append error to
	 * @param error - The error to display (YoutubeTranscriptError or AppError)
	 */
	renderError(container: HTMLElement, error: YoutubeTranscriptError | AppError): void {
		container.empty();

		const titleEl = container.createEl("div", {
			text: "Error loading transcript",
		});
		titleEl.style.marginBottom = "5px";

		// Get the error message
		const message = error instanceof YoutubeTranscriptError
			? error.message
			: (error as AppError).message || "Unknown error";

		// Get additional details if available
		const details = (error as AppError).details;

		const messageEl = container.createEl("div", {
			text: message,
		});
		messageEl.style.color = "var(--text-muted)";
		messageEl.style.fontSize = "var(--font-ui-small)";

		// Add details if available
		if (details) {
			const detailsEl = container.createEl("div", {
				text: details,
			});
			detailsEl.style.color = "var(--text-muted)";
			detailsEl.style.fontSize = "var(--font-ui-small)";
			detailsEl.style.marginTop = "5px";
		}
	}

	/**
	 * Clears a container
	 * @param container - Container to clear
	 */
	clear(container: HTMLElement): void {
		container.empty();
	}
}
