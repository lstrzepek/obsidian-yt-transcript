import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

const NO_HTML_STRINGS =
	"Use createEl/setText/textContent (STYLE.md: DOM and security).";

export default defineConfig([
	{
		ignores: ["main.js", "node_modules/**", "analysis/**", ".claude/**"],
	},
	// Same rule set Obsidian's community scorecard runs on releases.
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.{ts,mts,js,mjs}"],
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						"eslint.config.mjs",
						"esbuild.config.mjs",
						"version-bump.mjs",
						"jest.config.js",
					],
				},
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ args: "none", argsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "error",
		},
	},
	{
		// STYLE.md: no console in shipped code; Obsidian review rejects writing HTML strings.
		files: ["src/**/*.ts"],
		rules: {
			"no-console": "error",
			"no-restricted-syntax": [
				"error",
				{
					selector:
						"AssignmentExpression > MemberExpression.left[property.name=/^(innerHTML|outerHTML)$/]",
					message: NO_HTML_STRINGS,
				},
				{
					selector:
						"CallExpression > MemberExpression.callee[property.name='insertAdjacentHTML']",
					message: NO_HTML_STRINGS,
				},
			],
		},
	},
	{
		// CLAUDE.md: the domain layers must not depend on Obsidian.
		files: ["src/transcript/**/*.ts", "src/youtube/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					paths: [
						{
							name: "obsidian",
							message:
								"Domain code must stay framework-free; put this in src/obsidian/.",
						},
					],
					patterns: [
						{
							group: ["src/obsidian/*", "**/obsidian/*"],
							message:
								"Domain code must not depend on the Obsidian adapter.",
						},
					],
				},
			],
		},
	},
	{
		// Build tooling runs in Node, never inside Obsidian.
		files: ["*.mjs", "*.js"],
		rules: {
			"obsidianmd/no-nodejs-modules": "off",
			"no-undef": "off",
			// Rules for plugin runtime code: build output belongs on the console, and
			// there's no Vault#configDir outside Obsidian.
			"obsidianmd/rule-custom-message": "off",
			"obsidianmd/hardcoded-config-path": "off",
		},
	},
	{
		// Tests feed deliberately invalid input (null as any) to check guards.
		// Jest globals are typed via tsconfig "types", so no-undef adds nothing.
		files: ["tests/**/*.ts"],
		rules: {
			"no-undef": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
		},
	},
]);
