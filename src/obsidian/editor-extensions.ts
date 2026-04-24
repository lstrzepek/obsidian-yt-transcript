import type { Editor, EditorPosition } from "obsidian";

import { getUrlFromText } from "./url-text-utils";

export function getSelectedText(editor: Editor): string {
	if (!editor.somethingSelected()) {
		const [from, to] = getWordBoundaries(editor);
		editor.setSelection(from, to);
	}
	return editor.getSelection();
}

function getWordBoundaries(
	editor: Editor,
): [EditorPosition, EditorPosition] {
	const cursor = editor.getCursor();
	const lineText = editor.getLine(cursor.line);
	const urlPosition = getUrlFromText(lineText, cursor.ch);
	return [
		{ line: cursor.line, ch: urlPosition[0] },
		{ line: cursor.line, ch: urlPosition[1] },
	];
}
