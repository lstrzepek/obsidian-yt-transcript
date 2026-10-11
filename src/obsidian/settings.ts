import type { SettingDefinitionItem } from "obsidian";

export type OpenLocation = "right-sidebar" | "left-sidebar" | "tab" | "split";

export interface YTranscriptSettings {
	timestampMod: number;
	lang: string;
	country: string;
	openLocation: OpenLocation;
}

export type SettingKey = keyof YTranscriptSettings;

export const DEFAULT_SETTINGS: YTranscriptSettings = {
	timestampMod: 5,
	lang: "en",
	country: "EN",
	openLocation: "right-sidebar",
};

export const OPEN_LOCATION_OPTIONS: Record<OpenLocation, string> = {
	"right-sidebar": "Right sidebar",
	"left-sidebar": "Left sidebar",
	tab: "New tab",
	split: "Split (right)",
};

interface SettingText {
	name: string;
	desc: string;
	aliases: string[];
}

// Shared by the declarative definitions (Obsidian 1.13+) and the display() fallback.
export const SETTING_TEXT: Record<SettingKey, SettingText> = {
	timestampMod: {
		name: "Timestamp interval",
		desc: "How many transcript lines to group under each timestamp (1 = a timestamp on every line).",
		aliases: ["lines per timestamp", "grouping", "blocks"],
	},
	lang: {
		name: "Language",
		desc: "Preferred transcript language code, e.g. en or de. Falls back to the closest available track.",
		aliases: ["captions", "subtitles", "lang"],
	},
	country: {
		name: "Country",
		desc: "Country code sent to YouTube, e.g. US or PL.",
		aliases: ["region", "locale"],
	},
	openLocation: {
		name: "Open transcript in",
		desc: "Where the transcript view opens.",
		aliases: ["sidebar", "tab", "split", "panel", "view"],
	},
};

export function validateTimestampMod(value: number): string | undefined {
	if (!Number.isInteger(value) || value < 1) {
		return "Enter a whole number of 1 or more.";
	}
	return undefined;
}

export function buildSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
	return [
		{
			...SETTING_TEXT.timestampMod,
			control: {
				type: "number",
				key: "timestampMod",
				defaultValue: DEFAULT_SETTINGS.timestampMod,
				min: 1,
				step: 1,
				validate: validateTimestampMod,
			},
		},
		{
			...SETTING_TEXT.lang,
			control: {
				type: "text",
				key: "lang",
				defaultValue: DEFAULT_SETTINGS.lang,
				placeholder: DEFAULT_SETTINGS.lang,
			},
		},
		{
			...SETTING_TEXT.country,
			control: {
				type: "text",
				key: "country",
				defaultValue: DEFAULT_SETTINGS.country,
				placeholder: DEFAULT_SETTINGS.country,
			},
		},
		{
			...SETTING_TEXT.openLocation,
			control: {
				type: "dropdown",
				key: "openLocation",
				defaultValue: DEFAULT_SETTINGS.openLocation,
				options: OPEN_LOCATION_OPTIONS,
			},
		},
	];
}

export function isSettingKey(key: string): key is SettingKey {
	return Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, key);
}

export function isOpenLocation(value: unknown): value is OpenLocation {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(OPEN_LOCATION_OPTIONS, value)
	);
}

/**
 * Writes a value coming from the settings UI into `settings` if it has the
 * right shape for its key. Returns false (and leaves `settings` untouched)
 * for unknown keys or invalid values.
 */
export function applySettingValue(
	settings: YTranscriptSettings,
	key: string,
	value: unknown,
): boolean {
	switch (key) {
		case "timestampMod":
			if (typeof value !== "number" || validateTimestampMod(value)) {
				return false;
			}
			settings.timestampMod = value;
			return true;
		case "lang":
		case "country":
			if (typeof value !== "string") return false;
			settings[key] = value;
			return true;
		case "openLocation":
			if (!isOpenLocation(value)) return false;
			settings.openLocation = value;
			return true;
		default:
			return false;
	}
}
