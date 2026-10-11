# Contributing to YTranscript

Thanks for helping. Bug reports, fixes and small features are all welcome.

## Reporting bugs and requesting features

Use the issue templates on GitHub. For transcript failures, include the video URL, your language/country settings, and the error notice text — YouTube changes its API often, and the URL is usually what makes a bug reproducible.

## Development setup

```sh
npm ci
npm run dev      # watch build → main.js
```

To try it in Obsidian, symlink or copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/ytranscript/` and reload the plugin.

## Before opening a pull request

```sh
npm run check    # lint + tests + build + format check, same as CI
```

- Lint uses Obsidian's own rule set (`eslint-plugin-obsidianmd`), the same checks the community plugin scorecard runs. Warnings fail the build.
- Add or update a test for any behaviour change: `src/foo/bar.ts` → `tests/foo/bar.test.ts`. Tests never call YouTube; pass a fake `HttpClient` to `fetchTranscript`.
- Follow [STYLE.md](./STYLE.md). The short version: `src/transcript/` and `src/youtube/` must not import `obsidian`; no `innerHTML`; no `any` in `src/`.
- Keep pull requests to one change.

## Releases

Maintainers release with the **Release Obsidian plugin** GitHub workflow. Don't bump versions or edit `manifest.json`/`versions.json` by hand.
