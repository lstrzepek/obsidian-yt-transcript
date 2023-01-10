import { ItemView, WorkspaceLeaf } from "obsidian";
import YoutubeTranscript from "youtube-transcript";

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
  setEphemeralState({ url, timestampMod }: any): void {
    YoutubeTranscript.fetchTranscript(url)
      .then(data => {
        var div = createEl('div');

        data.forEach((line, i) => {
          if (i % timestampMod == 0) {
            div = createEl('div');
            const button = createEl('button', { cls: "timestamp", attr: { "data-timestamp": line.offset.toFixed() } });
            const link = createEl('a', { text: formatTimestamp(line.offset), attr: { "href": url + '&t=' + Math.floor(line.offset / 1000) } });
            button.appendChild(link);
            // button.innerText = formatTimestamp(line.offset);
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
