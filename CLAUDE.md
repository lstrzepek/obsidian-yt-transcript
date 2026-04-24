# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin called "YTranscript" that fetches and displays YouTube video transcripts within Obsidian. The plugin allows users to:
- Extract transcripts from YouTube URLs (either selected text or prompted input)
- Display transcripts in a side panel with clickable timestamps
- Search through transcript content
- Copy transcript blocks with timestamp links

## Development Commands

- `npm run dev` - Build in development mode with watch
- `npm run build` - TypeScript check + production build
- `npm test` - Run Jest tests
- `npm run check-format` - Check code formatting with Prettier
- `npm run version` - Bump version and update manifest files

## Architecture

The plugin follows Obsidian's plugin architecture with these key components:

### Core Files
- `src/main.ts` - Main plugin class with commands, settings, and view registration
- `src/transcript-view.ts` - Custom view for displaying transcripts in workspace
- `src/youtube-transcript.ts` - InnerTube Player API client that fetches caption tracks
- `src/api-parser.ts` - XML transcript parsing and video metadata extraction helpers
- `src/transcript-formatter.ts` - Formats transcript lines into markdown with configurable templates
- `src/url-detection.ts` - Detects and extracts YouTube URLs from editor text
- `src/prompt-modal.ts` - Modal for URL input prompt
- `src/commands/insert-transcript.ts` - Command that inserts a formatted transcript into the active note
- `src/editor-extensions.ts` - Helpers for reading selection / word boundaries from the editor

### Utilities
- `src/url-utils.ts` - URL validation and YouTube URL parsing
- `src/timestampt-utils.ts` - Timestamp formatting utilities
- `src/render-utils.ts` - Transcript rendering and text highlighting
- `src/types.ts` - TypeScript type definitions

### Test Files
- `tests/api-parser.test.ts` - Tests for caption track extraction and XML transcript parsing
- `tests/transcript-formatter.test.ts` - Tests for markdown formatting of transcript lines
- `tests/url-detection.test.ts` - Tests for URL detection in editor text
- `tests/url-utils.test.ts` - Tests for URL parsing utilities
- `tests/timestampt-utils.test.ts` - Tests for timestamp utilities

### Settings Structure
The plugin stores settings in `YTranscriptSettings`:
- `timestampMod`: Frequency of timestamps in transcript blocks
- `lang`: Preferred transcript language code
- `country`: Country code for transcript localization
- `leafUrls`: Array of URLs for open transcript views

### Transcript Fetching Flow
1. Extract the video ID from the provided YouTube URL
2. Call YouTube's InnerTube Player API (`/youtubei/v1/player`) posing as the IOS client; ANDROID no longer returns captions
3. Read `captions.playerCaptionsTracklistRenderer.captionTracks` from the response and pick the best track for the requested language (exact → prefix → first available)
4. Fetch the caption track's `baseUrl` to get the transcript XML
5. Parse the XML via `parseTranscriptXml` in `api-parser.ts` into `TranscriptLine` objects with text, duration, and offset

### View Management
- Uses Obsidian's `ItemView` to create custom transcript panels
- Supports multiple concurrent transcript views
- Tracks view state through ephemeral state and settings persistence
- Renders transcript blocks with clickable timestamps that open YouTube at specific times