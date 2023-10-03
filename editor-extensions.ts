import { Editor, EditorPosition } from "obsidian";
import { getUrlFromText } from "./src/url-utils";

export class EditorExtensions {
	public static getSelectedText(editor: Editor): string {
		if (!editor.somethingSelected()) {
			const wordBoundaries = this.getWordBoundaries(editor);
			editor.setSelection(wordBoundaries[0], wordBoundaries[1]);
		}
		return editor.getSelection();
	}

	private static getWordBoundaries(
		editor: Editor
	): [EditorPosition, EditorPosition] {
		const cursor = editor.getCursor();

		// If its a normal URL token this is not a markdown link
		// In this case we can simply overwrite the link boundaries as-is
		const lineText = editor.getLine(cursor.line);
		const urlPosition = getUrlFromText(lineText, cursor.ch);
		return [
			{ line: cursor.line, ch: urlPosition[0] },
			{ line: cursor.line, ch: urlPosition[1] },
		];
	}
}
