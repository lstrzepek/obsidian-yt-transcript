# YTranscript

Fetch the transcript of any YouTube video and use it in Obsidian: insert it into a note with clickable timestamps, or read and search it in a side panel.

Requires Obsidian 1.7.2 or later. Works on desktop and mobile.

## Usage

### Insert a transcript into your note (mobile-friendly)

1. Position cursor where you want the transcript inserted
2. Run the command **YTranscript: Insert YouTube transcript**
3. The plugin will detect YouTube URLs from:
   - Currently selected text in editor
   - System clipboard
   - Manual input (fallback)
4. Confirm or edit the URL in the prompt
5. Transcript will be inserted directly at cursor position with clickable timestamps
6. Continue writing your notes with the transcript content inline

This new command is perfect for mobile users and provides a seamless note-taking experience.

### Side panel (desktop)

1. In editor window select link to Youtube video
2. Run the command **YTranscript: Get YouTube transcript from selected URL** (or **…from URL prompt** to paste a link) <img width="704" alt="Screenshot 2024-01-03 at 21 59 48" src="https://github.com/lstrzepek/obsidian-yt-transcript/assets/185352/9a0d7fd5-f830-408c-b7d8-73840e7e2d1b">
3. Transcription will appear in side window with timestamp <img width="1499" alt="Screenshot 2024-01-03 at 22 02 04" src="https://github.com/lstrzepek/obsidian-yt-transcript/assets/185352/1412b043-ffe0-4f56-a448-307afbba1bb7">
4. In settings you can control how often a timestamp appears (once every x lines, default: 5), and where the panel opens
5. Clicking on timestamp opens video in that place
6. Right-click to copy all, or use the copy button
7. You can drag and drop lines of transcription or timestamp link

Both the classic side panel commands remain available for users who prefer the traditional workflow.

![YTranscriptPlugin2](https://user-images.githubusercontent.com/185352/212565518-3afc897a-84f1-479c-b588-cd35dd8b6cd3.gif)

## Network use and privacy

- **Network:** to fetch a transcript, the plugin sends the video ID and your language/country settings to YouTube (`youtube.com`, its InnerTube player API), then downloads the caption track. No other servers are contacted.
- **Clipboard:** the **Insert YouTube transcript** command reads your clipboard once, to pre-fill a YouTube link you copied. Copy actions write transcript text to the clipboard.
- No accounts, telemetry or analytics.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Acknowledgments

Many thanks to creators and contributors of following plugins:

-   [Auto Link Title](https://github.com/zolrath/obsidian-auto-link-title)
-   [Timestamp Notes](https://github.com/juliang22/ObsidianTimestampNotes)
-   [Recent Files](https://github.com/tgrosinger/recent-files-obsidian)
