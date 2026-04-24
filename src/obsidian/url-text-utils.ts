const UrlPattern =
	/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

function _getLinkNearestCursor(
	textLine: string,
	cursorPosition: number,
	linksInLine: string[],
) {
	if (cursorPosition > textLine.length)
		throw new Error("Cursor out of the line");
	if (!linksInLine || linksInLine.length < 1)
		throw new Error("No links found");
	for (let i = 0; i < linksInLine.length; i++) {
		const link = linksInLine[i];
		const index =
			linksInLine.length > i + 1
				? textLine.indexOf(linksInLine[i + 1])
				: textLine.length;
		if (cursorPosition <= index) return link;
	}
	throw new Error("Unexpected");
}

export function getUrlFromText(
	lineText: string,
	cursorPosition: number,
): [number, number] {
	const url = _getLinkNearestCursor(
		lineText,
		cursorPosition,
		lineText.match(UrlPattern) ?? [],
	);
	return [lineText.indexOf(url), lineText.indexOf(url) + url.length];
}
