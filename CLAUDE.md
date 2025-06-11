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
- `src/fetch-transcript.ts` - YouTube transcript fetching logic and API interaction
- `src/prompt-modal.ts` - Modal for URL input prompt

### Utilities
- `src/url-utils.ts` - URL validation and YouTube URL parsing
- `src/timestampt-utils.ts` - Timestamp formatting utilities
- `src/render-utils.ts` - Transcript rendering and text highlighting
- `src/types.ts` - TypeScript type definitions

### Settings Structure
The plugin stores settings in `YTranscriptSettings`:
- `timestampMod`: Frequency of timestamps in transcript blocks
- `lang`: Preferred transcript language code
- `country`: Country code for transcript localization
- `leafUrls`: Array of URLs for open transcript views

### Transcript Fetching Flow
1. Parse YouTube page HTML to extract `ytInitialPlayerResponse`
2. Extract caption tracks from player response
3. Select appropriate language track based on settings
4. Fetch XML captions from YouTube's caption API
5. Parse XML and format into `TranscriptLine` objects with text, duration, and offset

### View Management
- Uses Obsidian's `ItemView` to create custom transcript panels
- Supports multiple concurrent transcript views
- Tracks view state through ephemeral state and settings persistence
- Renders transcript blocks with clickable timestamps that open YouTube at specific times