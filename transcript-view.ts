import YTranscriptPlugin from "main";
import { ItemView, WorkspaceLeaf, Menu } from "obsidian";
import YoutubeTranscript, { TranscriptResponse } from "youtube-transcript";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";
const formatTimestamp = (t: number): string => {
  const fnum = (n: number) => (n && n < 10) ? "0" + n.toFixed() : n.toFixed();
  const s = 1000;
  const m = 60 * s;
  const h = 60 * m;
  const hours = Math.floor(t / h);
  const minutes = Math.floor((t - hours * h) / m);
  const seconds = Math.floor((t - minutes * m) / s);
  const time = hours ? [hours, minutes, seconds] : [minutes, seconds];
  return time.map(fnum).join(':')
}
export class TranscriptView extends ItemView {
  plugin: YTranscriptPlugin;
  transcript: TranscriptResponse[];
  constructor(leaf: WorkspaceLeaf, plugin: YTranscriptPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TRANSCRIPT_TYPE_VIEW;
  }
  getDisplayText(): string {
    return "Transcript";
  }
  getIcon(): string {
    return "scroll";
  }
  // onPaneMenu(menu: Menu): void {
  //   menu
  //     .addItem((item) => {
  //       item
  //       .setTitle('Copy as text')
  //     })
  //     .addItem((item) => {
  //       item
  //         .setTitle('Copy transcript')
  //         .setIcon('copy')
  //         .onClick(async () => {
  //           const file = this.app.workspace.getActiveFile();
  //           if (file === null) {
  //             new Notice("No active file");
  //             return;
  //           }
  //           const view = this.app.workspace.getActiveViewOfType(MarkdownView);
  //           console.log(view);
  //           if (view) {
  //             const editor = view.editor;
  //             editor.replaceRange(this.transcript.map(t => t.text).join(' '), editor.getCursor());
  //           }
  //         })
  //     })
  // }
  protected async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h4", { text: "Transcript" });
  }

  createTextLine(line: TranscriptResponse): HTMLSpanElement {
    const span = this.contentEl.createEl('span', { cls: "transcript-line", text: line.text + " " });
    span.setAttr('draggable', 'true');
    span.addEventListener('dragstart', (event: DragEvent) => {
      const dragManager = (this.app as any).dragManager;
      console.log(dragManager);
      const dragData = dragManager.dragLink(event, line.text);
      dragManager.onDragStart(event, dragData);
    });
    return span;
  }

  async setEphemeralState({ url, timestampMod, lang, country }: any): Promise<void> {
    try {
      const data = await YoutubeTranscript.fetchTranscript(url, { lang, country });
      if (!data) {
        this.contentEl.empty();
        this.contentEl.createEl('h4', { text: "No transcript found" });
        this.contentEl.createEl('div', { text: "Please check if video contains any transcript or try adjust language and country in plugin settings." });
        return;
      }
      this.transcript = data;

      var div = createEl('div');

      data.forEach((line, i) => {
        if (i % timestampMod == 0) {
          div = createEl('div');
          const button = createEl('button', { cls: "timestamp", attr: { "data-timestamp": line.offset.toFixed() } });
          const link = createEl('a', { text: formatTimestamp(line.offset), attr: { "href": url + '&t=' + Math.floor(line.offset / 1000) } });
          button.appendChild(link);
          const span = this.createTextLine(line);
          div.appendChild(button);
          div.appendChild(span);
          div.addEventListener('contextmenu', (event: MouseEvent) => {
            const menu = new Menu();
            menu.addItem((item) => item
            .setTitle('Copy all')
            .onClick(() => {
                navigator.clipboard.writeText(data.map(t=>t.text).join(' '));
              }));
            menu.showAtPosition({x: event.clientX, y: event.clientY});
          })
          this.contentEl.appendChild(div);
        }
        else {
          const span = this.createTextLine(line);
          div.appendChild(span);
        }
      });
    } catch (err) {
      this.contentEl.empty();
      this.contentEl.createEl('h4', { text: "Error" });
      this.contentEl.createEl('div', { text: err });
    }
  }
}
