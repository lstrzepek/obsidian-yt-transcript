import p from "phin";

const MarkdownUrlPattern =
	/\[([^\[\]]*)\]\((https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\)/gi;
const UrlPattern =
	/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

function _cursorWithinBoundaries(
	cursorPosition: number,
	startIndex: number,
	length: number
): boolean {
	let endIndex = startIndex + length;

	return startIndex <= cursorPosition && cursorPosition <= endIndex;
}

export function getUrlFromText(
	lineText: string,
	cursorPosition: number
): [number, number] {
	// First check if we're in a link
	let linksInLine = lineText.matchAll(MarkdownUrlPattern);

	for (let match of linksInLine) {
		if (
			_cursorWithinBoundaries(
				cursorPosition,
				match.index ?? 0,
				match[0].length
			)
		) {
			return [match.index ?? 0, (match.index ?? 0) + match[0].length];
		}
	}

	// If not, check if we're in just a standard ol' URL.
	let urlsInLine = lineText.matchAll(UrlPattern);

	for (let match of urlsInLine) {
		if (
			_cursorWithinBoundaries(
				cursorPosition,
				match.index ?? 0,
				match[0].length
			)
		) {
			return [match.index ?? 0, (match.index ?? 0) + match[0].length];
		}
	}

	return [cursorPosition, cursorPosition];
}

/**
 * Matches a YouTube URL
 * This is the same regex as the as the one used in `youtube-transcript`
 * @example
 * youtube.com/watch?v={video_id}
 * @example
 * youtube.com/v/{video_id}
 * @example
 * youtube.com/embed/{video_id}
 * @example
 * youtube.com/{any_path}/{video_id}
 * @example
 * youtu.be/{video_id}
 */
const YOUTUBE_URL_REGEX = new RegExp(
	/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
);

/**
 * Finds the title from the parsed youtube video HTML
 */
const YOUTUBE_TITLE_REGEX = new RegExp(
	/<meta\s+name="title"\s+content="([^"]*)">/
);

/**
 * Checks if a string is a valid YouTube URL
 * @param value - The string that we want to check
 */
export const isValidYoutubeURL = (value: string): boolean => {
	return value.match(YOUTUBE_URL_REGEX) !== null;
};

/**
 * Returns the encoded video title of a YouTube video
 * This function uses the `phin` library which is the same as the one used in `youtube-transcript`
 * @param url - the youtube video URL
 */
export const getYouTubeVideoTitle = async (url: string) => {
	//Fetch the raw htmlm of the Youtube video page
	const { body } = await p(url);
	//Search for the title in the raw html
	const match = body.toString().match(YOUTUBE_TITLE_REGEX);
	//Return the title if found, otherwise return an empty string
	if (match) return match[1];
	return "";
};
