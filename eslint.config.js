const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
	{
		ignores: ["main.js", "node_modules/**", "analysis/**"],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ args: "none", argsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
		},
	},
);
