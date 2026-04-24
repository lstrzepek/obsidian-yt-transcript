export class URLDetector {
	// YouTube URL patterns to match various formats
	private static readonly YOUTUBE_URL_PATTERNS = [
		/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+(?:[&?][\w=&-]*)?/gi,
		/https?:\/\/(?:www\.)?youtu\.be\/[\w-]+(?:[?][\w=&-]*)?/gi,
		/https?:\/\/(?:m\.)?youtube\.com\/watch\?v=[\w-]+(?:[&?][\w=&-]*)?/gi,
		/https?:\/\/(?:mobile\.)?youtube\.com\/watch\?v=[\w-]+(?:[&?][\w=&-]*)?/gi,
		/https?:\/\/(?:music\.)?youtube\.com\/watch\?v=[\w-]+(?:[&?][\w=&-]*)?/gi,
	];

	// More comprehensive regex for matching YouTube URLs
	private static readonly YOUTUBE_DOMAINS = [
		"youtube.com",
		"www.youtube.com",
		"m.youtube.com",
		"mobile.youtube.com",
		"music.youtube.com",
		"youtu.be",
		"www.youtu.be",
	];

	/**
	 * Checks if the provided URL is a valid YouTube URL
	 * @param url - The URL to validate
	 * @returns true if the URL is a valid YouTube URL, false otherwise
	 */
	public static isValidYouTubeUrl(url: string | null | undefined): boolean {
		if (!url || typeof url !== "string") {
			return false;
		}

		try {
			const urlObj = new URL(url);

			// Check if hostname matches any YouTube domain
			const hostname = urlObj.hostname.toLowerCase();
			const isYouTubeDomain = this.YOUTUBE_DOMAINS.includes(hostname);

			if (!isYouTubeDomain) {
				return false;
			}

			// For youtube.com domains, check for valid watch path
			if (hostname.includes("youtube.com")) {
				return (
					urlObj.pathname === "/watch" && urlObj.searchParams.has("v")
				);
			}

			// For youtu.be, check for valid video ID in path
			if (hostname.includes("youtu.be")) {
				const pathParts = urlObj.pathname.split("/");
				return pathParts.length >= 2 && pathParts[1].length > 0;
			}

			return false;
		} catch (error) {
			// Invalid URL format
			return false;
		}
	}

	/**
	 * Extracts the first valid YouTube URL found in the provided text
	 * @param text - The text to search for YouTube URLs
	 * @returns The first valid YouTube URL found, or null if none found
	 */
	public static extractYouTubeUrlFromText(
		text: string | null | undefined,
	): string | null {
		if (!text || typeof text !== "string") {
			return null;
		}

		// Use a general URL regex to find all potential URLs
		const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
		const matches = text.match(urlRegex);

		if (!matches) {
			return null;
		}

		// Check each found URL to see if it's a valid YouTube URL
		for (const match of matches) {
			if (this.isValidYouTubeUrl(match)) {
				return match;
			}
		}

		return null;
	}

	/**
	 * Creates a YouTube URL with a timestamp parameter
	 * @param url - The base YouTube URL
	 * @param offsetMs - The timestamp offset in milliseconds
	 * @returns The URL with timestamp parameter added
	 */
	public static buildTimestampUrl(url: string, offsetMs: number): string {
		if (!url || typeof url !== "string") {
			return "";
		}

		try {
			const urlObj = new URL(url);
			const seconds = Math.max(0, Math.floor(offsetMs / 1000));
			urlObj.searchParams.set("t", seconds.toString());
			return urlObj.toString();
		} catch (error) {
			// If URL parsing fails, return original URL
			return url;
		}
	}
}
