import { YoutubeTranscriptError } from "../../core/youtube-transcript";

export enum ErrorType {
	NETWORK = "NETWORK",
	INVALID_URL = "INVALID_URL",
	NO_TRANSCRIPT = "NO_TRANSCRIPT",
	UNAVAILABLE = "UNAVAILABLE",
	UNKNOWN = "UNKNOWN",
}

export interface AppError {
	type: ErrorType;
	message: string;
	details?: string;
	originalError?: Error;
}

/**
 * Service responsible for handling and formatting errors
 * Converts raw errors to user-friendly messages and logs them appropriately
 */
export class ErrorHandlingService {
	/**
	 * Converts any error type to a standardized AppError
	 * @param error - The raw error (can be YoutubeTranscriptError, Error, or unknown)
	 * @returns Standardized AppError with user-friendly message
	 */
	handleError(error: unknown): AppError {
		try {
			if (error instanceof YoutubeTranscriptError) {
				return this.handleYoutubeTranscriptError(error);
			} else if (error instanceof Error) {
				return this.handleStandardError(error);
			} else {
				return this.handleUnknownError(error);
			}
		} catch (err) {
			// Fallback for unexpected errors
			return {
				type: ErrorType.UNKNOWN,
				message: "An unexpected error occurred",
				details: "Please try again or check your connection",
			};
		}
	}

	/**
	 * Handles YoutubeTranscriptError specifically
	 */
	private handleYoutubeTranscriptError(error: YoutubeTranscriptError): AppError {
		const message = error.message || "";

		// Categorize based on error message
		if (message.includes("Invalid YouTube URL") || message.includes("ERR_INVALID_URL")) {
			return {
				type: ErrorType.INVALID_URL,
				message: "Invalid YouTube URL",
				details: "Please ensure the URL is a valid YouTube video link",
				originalError: error,
			};
		}

		if (message.includes("No transcript found") || message.includes("No captions available")) {
			return {
				type: ErrorType.NO_TRANSCRIPT,
				message: "No transcript available",
				details: "This video doesn't have a transcript in the requested language. Try adjusting language and country settings in plugin settings.",
				originalError: error,
			};
		}

		if (message.includes("Available:")) {
			return {
				type: ErrorType.UNAVAILABLE,
				message: "Transcript unavailable in requested language",
				details: message, // Show the available languages
				originalError: error,
			};
		}

		// Generic YouTube error
		return {
			type: ErrorType.UNKNOWN,
			message: "Failed to fetch transcript",
			details: message || "Unknown YouTube API error",
			originalError: error,
		};
	}

	/**
	 * Handles standard JavaScript Error
	 */
	private handleStandardError(error: Error): AppError {
		const message = error.message || "";

		// Network errors
		if (
			message.includes("network") ||
			message.includes("fetch") ||
			message.includes("connection") ||
			message.includes("ERR_INTERNET_DISCONNECTED")
		) {
			return {
				type: ErrorType.NETWORK,
				message: "Network connection failed",
				details: "Please check your internet connection and try again",
				originalError: error,
			};
		}

		// Generic error
		return {
			type: ErrorType.UNKNOWN,
			message: "An error occurred",
			details: message || "Unknown error",
			originalError: error,
		};
	}

	/**
	 * Handles completely unknown errors
	 */
	private handleUnknownError(error: unknown): AppError {
		console.error("Unknown error type:", error);
		return {
			type: ErrorType.UNKNOWN,
			message: "An unexpected error occurred",
			details: "Please try again or contact support if the problem persists",
		};
	}

	/**
	 * Logs error for debugging purposes
	 */
	logError(error: AppError): void {
		const logMessage = `[${error.type}] ${error.message}`;
		const logDetails = error.details ? `\n${error.details}` : "";
		const originalError = error.originalError ? `\n${error.originalError}` : "";

		console.error(`${logMessage}${logDetails}${originalError}`);
	}

	/**
	 * Checks if error is recoverable
	 */
	isRecoverable(error: AppError): boolean {
		switch (error.type) {
			case ErrorType.NETWORK:
			case ErrorType.INVALID_URL:
				return true;
			case ErrorType.NO_TRANSCRIPT:
			case ErrorType.UNAVAILABLE:
				return false; // User should change settings or URL
			case ErrorType.UNKNOWN:
			default:
				return false;
		}
	}

	/**
	 * Gets suggested user action based on error type
	 */
	getSuggestedAction(error: AppError): string {
		switch (error.type) {
			case ErrorType.NETWORK:
				return "Check your internet connection and try again";
			case ErrorType.INVALID_URL:
				return "Verify the YouTube URL and try again";
			case ErrorType.NO_TRANSCRIPT:
				return "Try a different video or adjust language settings";
			case ErrorType.UNAVAILABLE:
				return "Change your language preference in plugin settings";
			case ErrorType.UNKNOWN:
			default:
				return "Please try again";
		}
	}
}
