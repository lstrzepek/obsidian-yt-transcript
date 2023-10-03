const MarkdownUrlPattern =
	/\[([^\[\]]*)\]\((https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\)/gi;
const UrlPattern =
	/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

function _cursorWithinBoundaries(
	cursorPosition: number,
	startIndex: number,
	length: number,
): boolean {
	const endIndex = startIndex + length;

	return startIndex <= cursorPosition && cursorPosition <= endIndex;
}

export function getUrlFromText(
	lineText: string,
	cursorPosition: number,
): [number, number] {
	// First check if we're in a link
	const linksInLine = lineText.matchAll(MarkdownUrlPattern);

	for (const match of linksInLine) {
		if (
			_cursorWithinBoundaries(
				cursorPosition,
				match.index ?? 0,
				match[0].length,
			)
		) {
			return [match.index ?? 0, (match.index ?? 0) + match[0].length];
		}
	}

	// If not, check if we're in just a standard ol' URL.
	const urlsInLine = lineText.matchAll(UrlPattern);

	for (const match of urlsInLine) {
		if (
			_cursorWithinBoundaries(
				cursorPosition,
				match.index ?? 0,
				match[0].length,
			)
		) {
			return [match.index ?? 0, (match.index ?? 0) + match[0].length];
		}
	}

	return [cursorPosition, cursorPosition];
}
