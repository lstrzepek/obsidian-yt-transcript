/**
 * Highlights matched text in the div
 * @param div - the div that we want to highlight
 * @param searchValue - the value that will be highlight
 */
export const highlightText = (div: HTMLElement, searchValue: string) => {
	const content = div.innerHTML;
	const highlightedContent = content.replace(
		new RegExp(searchValue, "gi"),
		'<span class="yt-transcript__highlight">$&</span>'
	);
	div.innerHTML = highlightedContent;
};
