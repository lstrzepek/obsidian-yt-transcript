import { ItemView, WorkspaceLeaf } from "obsidian";
import YoutubeTranscript from "youtube-transcript";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";
const formatTimestamp = (t: number): string => {
  const fnum = (n: number) => (n && n < 10) ? "0" + n.toFixed() : n.toFixed();
  const h = 3600 * 1000;
  const hours = Math.floor(t / h);
  const m = 60 * 1000;
  const minutes = Math.floor((t - hours * h) / m);
  const ms = 1000;
  const seconds = Math.floor((t - minutes * m) / ms);
  const time = hours ? [hours, minutes, seconds] : [minutes, seconds];
  return time.map(fnum).join(':')
}
export class TranscriptView extends ItemView {

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return TRANSCRIPT_TYPE_VIEW;
  }
  getDisplayText(): string {
    return "Transcript";
  }
  protected async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h4", { text: "Transcript" });
  }
  setEphemeralState({ url }: any): void {
    YoutubeTranscript.fetchTranscript(url)
      .then(data => {
        var div = createEl('div');

        data.forEach((line, i) => {
          if (i % 32 == 0) {
            div = createEl('div');
            const button = createEl('button', { cls: "timestamp", attr: { "data-timestamp": line.offset.toFixed() } });
            button.innerText = formatTimestamp(line.offset);
            const span = this.contentEl.createEl('span', { cls: "transcript-line", text: line.text + " " });
            div.appendChild(button);
            div.appendChild(span);
            this.contentEl.appendChild(div);
          }
          else {

            const span = this.contentEl.createEl('span', { cls: "transcript-line", text: line.text + " " });
            div.appendChild(span);
          }
        })
      });
  }
}
