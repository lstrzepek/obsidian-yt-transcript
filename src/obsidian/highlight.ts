export function highlightText(el: HTMLElement, searchValue: string): void {
	if (!searchValue) return;

	const needle = searchValue.toLowerCase();
	const doc = el.doc;
	const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
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

		const fragment = createFragment();
		while (matchIdx !== -1) {
			if (matchIdx > searchFrom) {
				fragment.appendChild(
					doc.createTextNode(text.slice(searchFrom, matchIdx)),
				);
			}
			fragment.appendChild(
				createSpan({
					cls: "yt-transcript__highlight",
					text: text.slice(matchIdx, matchIdx + needle.length),
				}),
			);
			searchFrom = matchIdx + needle.length;
			matchIdx = lower.indexOf(needle, searchFrom);
		}
		if (searchFrom < text.length) {
			fragment.appendChild(doc.createTextNode(text.slice(searchFrom)));
		}
		parent.replaceChild(fragment, textNode);
	}
}
