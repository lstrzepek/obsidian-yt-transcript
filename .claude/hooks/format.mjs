// PostToolUse hook: run Prettier on the file Claude just edited, if it lives in src/ or tests/.
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import * as prettier from "prettier";

const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input?.tool_input?.file_path;
if (!filePath) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const rel = relative(projectDir, resolve(filePath)).split(sep).join("/");
if (!/^(src|tests)\/.+\.(ts|js|mjs)$/.test(rel)) process.exit(0);

const absolute = resolve(projectDir, rel);
const source = readFileSync(absolute, "utf8");
const options = (await prettier.resolveConfig(absolute, { editorconfig: true })) ?? {};
const formatted = await prettier.format(source, { ...options, filepath: absolute });
if (formatted !== source) writeFileSync(absolute, formatted);
