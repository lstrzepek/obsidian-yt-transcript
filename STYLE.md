# Style guide

Conventions for this plugin. Keep it short; expand only when a real conflict forces it.

## Module shape

**Export plain functions, not static-only classes.** A class whose methods are all `static` is a namespace with extra ceremony.

```ts
// no
export class TranscriptFormatter {
    public static format(t: TranscriptResponse, url: string, o: FormatOptions): string { ... }
}

// yes
export function formatTranscript(t: TranscriptResponse, url: string, o: FormatOptions): string { ... }
```

Use `class` only when you need instance state (e.g. `TranscriptView extends ItemView` — Obsidian requires it).

Prefer `export function foo() {}` over `export const foo = () => {}`. Named function declarations show up better in stack traces and hoist cleanly.

## Imports

Use **relative paths within the same feature folder**, and the `src/...` absolute form when crossing feature boundaries. Don't mix styles in the same file.

```ts
// same folder / nearby
import { parseTranscriptXml } from "./parse-xml";

// crossing feature
import { formatTimestamp } from "src/transcript/timestamp";
```

Group imports in this order, separated by blank lines:
1. `obsidian` and third-party
2. Absolute `src/...`
3. Relative `./` and `../`

## Naming

- Files: `kebab-case.ts`.
- Types, interfaces, classes: `PascalCase`.
- Functions, variables: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` only for true compile-time constants (regexes, API keys, URL templates).
- "YouTube" is one word with a capital T — `YouTubeTranscript`, not `YoutubeTranscript` or `YoutubeURL`.
- Acronyms: treat as words in identifiers — `UrlDetector`, not `URLDetector`; `HttpClient`, not `HTTPClient`.
- No abbreviations in public names (`timestamp`, not `tstamp`; `transcript`, not `trans`).

## Types

- `"strict": true` in `tsconfig.json`. No exceptions.
- No `any`. If you're bridging an untyped external shape (YouTube's InnerTube response), type the narrow slice you actually read and mark the boundary with a comment.
- Prefer string literal unions over `enum`. Cheaper at runtime, better tree-shaking.

```ts
// no
export enum FormatTemplate { MINIMAL = "minimal", STANDARD = "standard", RICH = "rich" }

// yes
export type FormatTemplate = "minimal" | "standard" | "rich";
```

- `interface` for object shapes, `type` for unions, intersections, and mapped types.
- Export types `import type { ... }` when only used in type positions.

## Error handling

- One domain error class: `YouTubeTranscriptError`. Wrap at boundaries (network, parse), let it propagate.
- Don't swallow errors silently. Commands that fail user-visibly must show a `new Notice(msg)`; views should render an error state.
- Don't `throw "string"` and don't throw generic `Error` from domain code — use `YouTubeTranscriptError`.
- `catch (e: unknown)`, never `catch (e)` or `catch (e: any)`. Narrow before reading fields.

## Logging

- No `console.log` in shipped code paths. If you need diagnostics, gate them behind a single `DEBUG` flag read once at module load, or remove them before merge.
- No emoji in log output.

## DOM and security

- **Never** assign to `innerHTML`, `outerHTML`, or call `insertAdjacentHTML`. Use `createEl`, `createSpan`, `setText`, `textContent`. Obsidian's plugin review rejects `innerHTML`.
- No inline `element.style.x = ...` for anything reusable — put it in `styles.css` under a `yt-transcript__*` class. Inline styles are OK only for one-off dynamic values (e.g. computed positions).

## Architecture: keep Obsidian out of the domain

Folders `transcript/` and `youtube/` are **pure logic**. They must not `import` from `"obsidian"` or touch DOM.

The Obsidian adapter lives under `obsidian/` (plugin entry, views, modals, commands, editor helpers). It depends on the domain, never the reverse.

HTTP calls go through an `HttpClient` interface provided by the adapter, so `transcript/fetch.ts` stays framework-free.

```
src/
  transcript/    # framework-free domain
  youtube/       # framework-free URL handling
  obsidian/      # all framework-touching code
```

If you need to ask "where does this file go?" — if it imports `obsidian` or a DOM type, it belongs in `obsidian/`.

## Comments

Default to **no** comments. Names carry the meaning.

Write a comment only when the **why** is non-obvious: a workaround for a YouTube API quirk, a subtle invariant, a deliberate deviation. Don't narrate what the code does. Don't reference tickets or past bugs.

```ts
// no: // Loop through lines and build blocks
// yes: // InnerTube IOS client is the only one that still returns caption URLs without PO tokens (2026-01).
```

## Formatting

Prettier + `.editorconfig` are the source of truth. Don't argue about tabs, quotes, or semicolons in reviews — run `npm run check-format`.

## Tests

- One test file per source file: `src/foo/bar.ts` → `tests/foo/bar.test.ts`.
- Test files import from `src/...` via the tsconfig baseUrl, not with long `../../..` paths.
- No fixtures over ~10 KB checked in. If you need a large sample, summarise it or generate it in `beforeAll`.
