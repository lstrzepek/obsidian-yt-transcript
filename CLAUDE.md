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
- `src/youtube-transcript.ts` - Main YouTube transcript fetching logic and API orchestration
- `src/api-parser.ts` - YouTube page parsing and API request generation
- `src/prompt-modal.ts` - Modal for URL input prompt

### Utilities
- `src/url-utils.ts` - URL validation and YouTube URL parsing
- `src/timestampt-utils.ts` - Timestamp formatting utilities
- `src/render-utils.ts` - Transcript rendering and text highlighting
- `src/caption-parser.ts` - XML caption parsing utilities
- `src/types.ts` - TypeScript type definitions

### Test Files
- `tests/api-parser.test.ts` - Tests for YouTube page parsing logic
- `tests/caption-parser.test.ts` - Tests for XML caption parsing
- `tests/params-generation.test.ts` - Tests for parameter generation
- `tests/timestampt-utils.test.ts` - Tests for timestamp utilities
- `tests/url-utils.test.ts` - Tests for URL parsing utilities
- `tests/exampleVideo*.html` - Sample YouTube page HTML for testing
- `tests/fetchTranscript.http` - HTTP request examples for API testing

### Settings Structure
The plugin stores settings in `YTranscriptSettings`:
- `timestampMod`: Frequency of timestamps in transcript blocks
- `lang`: Preferred transcript language code
- `country`: Country code for transcript localization
- `leafUrls`: Array of URLs for open transcript views

### Transcript Fetching Flow
1. Parse YouTube page HTML to extract `ytInitialData`
2. Recursively search for `getTranscriptEndpoint.params` in the parsed data
3. Generate fallback parameter combinations using protobuf encoding
4. Try each parameter combination with YouTube's internal transcript API
5. Parse JSON response to extract transcript segments with timestamps
6. Format into `TranscriptLine` objects with text, duration, and offset

### Debugging and Logging
The plugin includes comprehensive logging to help debug transcript fetching issues:
- HTML parsing progress and ytInitialData extraction
- Parameter extraction and comparison with generated fallbacks
- API request attempts with detailed success/failure information
- Transcript line count and parsing results

### View Management
- Uses Obsidian's `ItemView` to create custom transcript panels
- Supports multiple concurrent transcript views
- Tracks view state through ephemeral state and settings persistence
- Renders transcript blocks with clickable timestamps that open YouTube at specific times