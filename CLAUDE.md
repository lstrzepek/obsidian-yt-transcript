# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project overview

Obsidian plugin "YTranscript" — fetches and displays YouTube video transcripts inside Obsidian:

- Extract transcripts from YouTube URLs (selected text or prompt)
- Display transcripts in a side panel with clickable timestamps
- Search transcript content
- Copy transcript blocks with timestamp links
- Insert a formatted transcript into a note via command

## Development

- `npm run dev` — watch build
- `npm run build` — `tsc -noEmit` + esbuild production bundle
- `npm test` — Jest
- `npm run check-format` — Prettier check

Read [STYLE.md](./STYLE.md) before making non-trivial changes.

## Architecture

Code is split into three layers. The domain layers (`transcript/`, `youtube/`) have no `obsidian` import. All framework-touching code lives under `obsidian/`. This is load-bearing — don't leak `obsidian` imports into the domain.

`transcript/` holds source-agnostic shapes and transformations on a transcript. `youtube/` holds everything specific to YouTube as a source: URL handling, the InnerTube fetcher, caption XML parsing, and the YouTube-specific config/error types.

```
src/
  transcript/                 source-agnostic transcript transformations
    format.ts                 TranscriptResponse → markdown (minimal/standard/rich)
    blocks.ts                 group TranscriptLines into TranscriptBlocks
    timestamp.ts              ms → "HH:MM:SS"
    types.ts                  TranscriptLine / TranscriptResponse / TranscriptBlock
  youtube/                    YouTube-specific code
    url.ts                    URL validation, extraction, timestamp URL builder
    fetch.ts                  InnerTube Player API client; takes an HttpClient
    parse-captions.ts         YouTube caption XML → TranscriptLine[]
    http.ts                   HttpClient interface (implemented in obsidian/)
    types.ts                  TranscriptConfig / YouTubeTranscriptError
  obsidian/                   framework adapter
    plugin.ts                 YTranscriptPlugin entry + settings tab (esbuild entryPoint)
    http.ts                   obsidianHttp: HttpClient implementation using requestUrl
    highlight.ts              DOM search highlighter
    editor-extensions.ts      selection / URL-near-cursor helpers
    url-text-utils.ts         generic URL-in-line finder (used by editor-extensions)
    views/
      transcript-view.ts      side-panel ItemView
    modals/
      prompt-modal.ts         URL input modal
    commands/
      insert-transcript.ts    InsertTranscriptCommand (used by the insert command)

tests/                        mirrors src/ layout; uses src/... absolute imports
```

## Transcript fetching flow

1. Extract the video ID from the URL.
2. Call `https://www.youtube.com/youtubei/v1/player` (InnerTube) posing as the IOS client. ANDROID stopped returning captions in early 2026; IOS returns caption URLs that work without PO tokens.
3. Read `captions.playerCaptionsTracklistRenderer.captionTracks`. Pick the best track for the requested language: exact → language prefix → first available.
4. `GET` the track's `baseUrl` to retrieve transcript XML.
5. Parse the XML via `parseCaptionXml` (in `youtube/parse-captions.ts`) into `TranscriptLine[]` (`text`, `offset` ms, `duration` ms).

`fetchTranscript(url, http, config)` takes an `HttpClient` so the domain doesn't depend on Obsidian. Callers pass `obsidianHttp` from `src/obsidian/http.ts`.

## Settings

Stored as `YTranscriptSettings` (defined in `src/obsidian/plugin.ts`):

- `timestampMod` — how many lines per timestamp block (1 = every line)
- `lang` — preferred caption language code
- `country` — localization country code
- `leafUrls` — URLs of open transcript views (persistence)

## View management

`TranscriptView` extends Obsidian's `ItemView`. Multiple concurrent views are supported; view state is tracked via ephemeral state and `leafUrls`. Blocks render with clickable timestamps that open YouTube at the right moment.
