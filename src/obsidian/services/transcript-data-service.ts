import {
	TranscriptResponse,
	YoutubeTranscript,
	YoutubeTranscriptError,
} from "../../core/youtube-transcript";
import type { YTranscriptSettings } from "../../settings";

export interface TranscriptLoadState {
	isLoading: boolean;
	isLoaded: boolean;
	error: YoutubeTranscriptError | null;
	data: TranscriptResponse | null;
}

/**
 * Service responsible for loading and managing transcript data
 * Encapsulates all async operations and state management
 */
export class TranscriptDataService {
	private loadState: TranscriptLoadState = {
		isLoading: false,
		isLoaded: false,
		error: null,
		data: null,
	};

	constructor() {}

	getLoadState(): TranscriptLoadState {
		return { ...this.loadState };
	}

	isDataLoaded(): boolean {
		return this.loadState.isLoaded;
	}

	hasError(): boolean {
		return this.loadState.error !== null;
	}

	getError(): YoutubeTranscriptError | null {
		return this.loadState.error;
	}

	getData(): TranscriptResponse | null {
		return this.loadState.data;
	}

	/**
	 * Loads transcript data from YouTube
	 * @param url - The YouTube video URL
	 * @param settings - Plugin settings for language/country preferences
	 */
	async loadTranscript(url: string, settings: YTranscriptSettings): Promise<void> {
		this.loadState.isLoading = true;
		this.loadState.error = null;
		this.loadState.data = null;

		try {
			const data = await YoutubeTranscript.getTranscript(url, {
				lang: settings.lang,
				country: settings.country,
			});

			if (!data) {
				throw new Error("No transcript data returned");
			}

			this.loadState.data = data;
			this.loadState.isLoaded = true;
		} catch (err: unknown) {
			let errorMessage: YoutubeTranscriptError;

			if (err instanceof YoutubeTranscriptError) {
				errorMessage = err;
			} else if (err instanceof Error) {
				errorMessage = new YoutubeTranscriptError(err);
			} else {
				errorMessage = new YoutubeTranscriptError(
					new Error("Unknown error occurred"),
				);
			}

			this.loadState.error = errorMessage;
			this.loadState.data = null;
			this.loadState.isLoaded = false;
		} finally {
			this.loadState.isLoading = false;
		}
	}

	/**
	 * Resets the service state
	 */
	reset(): void {
		this.loadState = {
			isLoading: false,
			isLoaded: false,
			error: null,
			data: null,
		};
	}
}
