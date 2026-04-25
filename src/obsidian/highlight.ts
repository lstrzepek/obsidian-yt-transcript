export function highlightText(el: HTMLElement, searchValue: string): void {
	if (!searchValue) return;

	const needle = searchValue.toLowerCase();
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const textNodes: Text[] = [];
	let node = walker.nextNode();
	while (node) {
		textNodes.push(node as Text);
		node = walker.nextNode();
	}

	for (const textNode of textNodes) {
		const text = textNode.nodeValue ?? "";
		const lower = text.toLowerCase();
		let searchFrom = 0;
		let matchIdx = lower.indexOf(needle, searchFrom);
		if (matchIdx === -1) continue;

		const parent = textNode.parentNode;
		if (!parent) continue;

		const fragment = document.createDocumentFragment();
		while (matchIdx !== -1) {
			if (matchIdx > searchFrom) {
				fragment.appendChild(
					document.createTextNode(text.slice(searchFrom, matchIdx)),
				);
			}
			const mark = document.createElement("span");
			mark.className = "yt-transcript__highlight";
			mark.textContent = text.slice(matchIdx, matchIdx + needle.length);
			fragment.appendChild(mark);
			searchFrom = matchIdx + needle.length;
			matchIdx = lower.indexOf(needle, searchFrom);
		}
		if (searchFrom < text.length) {
			fragment.appendChild(
				document.createTextNode(text.slice(searchFrom)),
			);
		}
		parent.replaceChild(fragment, textNode);
	}
}
