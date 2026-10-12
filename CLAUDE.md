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

Node 24 (`.nvmrc`). CI and the release workflow read the version from `.nvmrc` — change it there, not in the workflows.

- `npm run dev` — watch build. If a test vault is configured (`OBSIDIAN_VAULT` or a gitignored `.obsidian-vault` file), every build also copies `main.js`, `manifest.json` and `styles.css` into it — see CONTRIBUTING.md.
- `npm run build` — `tsc -noEmit` + esbuild production bundle
- `npm test` — Jest
- `npm run lint` — ESLint with Obsidian's official rule set (`eslint-plugin-obsidianmd`, the same checks the community scorecard runs on releases) plus our architecture/DOM rules. Warnings fail it. ESLint stays on v9 until the Obsidian plugin supports v10.
- `npm run check-format` / `npm run format` — Prettier check / fix
- `npm run check` — all of the above in CI order; this is the gate

Read [STYLE.md](./STYLE.md) before making non-trivial changes.

## Definition of done

Before reporting a task as finished:

1. `npm run check` passes. Don't silence a lint rule to get there — fix the code, or say why the rule is wrong.
2. Changed behaviour has a test in the mirrored `tests/` file (`src/foo/bar.ts` → `tests/foo/bar.test.ts`). Bug fixes start with a failing test.
3. If you changed the architecture, the fetch flow, or a convention, update this file or STYLE.md in the same change.
4. Summarise what changed and anything you couldn't verify (e.g. behaviour inside Obsidian, live YouTube responses).

Edited files under `src/` and `tests/` are auto-formatted by a hook (`.claude/hooks/format.mjs`).

## Working rules

- Don't hit YouTube from tests. `fetchTranscript` takes an `HttpClient` — pass a fake that returns canned responses.
- Don't commit `main.js` or `data.json` (gitignored; releases are built by `.github/workflows/release.yml`).
- Don't bump versions or edit `manifest.json`/`versions.json` by hand. Releases run via the manual "Release Obsidian plugin" GitHub workflow (`release.yml`), which bumps, builds, tags and publishes.
- For anything touching more than one layer, propose a plan before editing.
- `minAppVersion` is 1.7.2. The linter flags any Obsidian API newer than that; raise `minAppVersion` deliberately rather than suppressing the rule.
- Don't detach views in `onunload`, and don't add a heading to the settings tab — Obsidian's guidelines reject both.

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
    settings.ts               settings type/defaults, declarative definitions, validation (type-only obsidian import, unit-tested)
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

Stored as `YTranscriptSettings` (defined in `src/obsidian/settings.ts`):

- `timestampMod` — how many lines per timestamp block (1 = every line)
- `lang` — preferred caption language code
- `country` — localization country code
- `openLocation` — where the transcript view opens (`right-sidebar` / `left-sidebar` / `tab` / `split`)

The settings tab has two render paths:

- **Obsidian 1.13+:** `getSettingDefinitions()` returns `buildSettingDefinitions()`; Obsidian renders the tab and indexes every setting for settings search. `display()` is not called.
- **Obsidian 1.7.2–1.12:** `display()` renders the same settings imperatively.

Both paths share names/descriptions (`SETTING_TEXT`) and write through `setControlValue` → `applySettingValue`, which rejects invalid values. To add a setting: add it to `YTranscriptSettings`, `DEFAULT_SETTINGS`, `SETTING_TEXT`, `buildSettingDefinitions`, `applySettingValue` and `display()` — the tests fail if the definitions and stored keys drift apart.

## View management

`TranscriptView` extends Obsidian's `ItemView`. Multiple concurrent views are supported; each view receives its URL and transcript via `setEphemeralState`. Blocks render with clickable timestamps that open YouTube at the right moment.
