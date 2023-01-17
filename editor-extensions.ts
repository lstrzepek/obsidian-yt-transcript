import { Editor, EditorPosition } from "obsidian";

interface WordBoundaries {
  start: { line: number; ch: number };
  end: { line: number; ch: number };
}

export class EditorExtensions {
  public static getSelectedText(editor: Editor): string {
    if (!editor.somethingSelected()) {
      let wordBoundaries = this.getWordBoundaries(editor);
      editor.setSelection(wordBoundaries.start, wordBoundaries.end);
    }
    return editor.getSelection();
  }

  private static cursorWithinBoundaries(cursor: EditorPosition, startIndex: number, length: number): boolean {
    let endIndex = startIndex + length;

    return startIndex <= cursor.ch && cursor.ch <= endIndex;
  }

  private static getWordBoundaries(editor: Editor): WordBoundaries {
    let cursor = editor.getCursor();

    // If its a normal URL token this is not a markdown link
    // In this case we can simply overwrite the link boundaries as-is
    let lineText = editor.getLine(cursor.line);

    // First check if we're in a link
    let linksInLine = lineText.matchAll(/\[([^\[\]]*)\]\((https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})\)/gi);

    for (let match of linksInLine) {
      if (this.cursorWithinBoundaries(cursor, match.index ?? 0, match[0].length)) {
        return {
          start: { line: cursor.line, ch: match.index ?? 0 },
          end: { line: cursor.line, ch: match.index ?? 0 + match[0].length },
        };
      }
    }

    // If not, check if we're in just a standard ol' URL.
    let urlsInLine = lineText.matchAll(/(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi);

    for (let match of urlsInLine) {
      if (this.cursorWithinBoundaries(cursor, match.index ?? 0, match[0].length)) {
        return {
          start: { line: cursor.line, ch: match.index ?? 0 },
          end: { line: cursor.line, ch: match.index ?? 0 + match[0].length },
        };
      }
    }

    return {
      start: cursor,
      end: cursor,
    };
  }
}
