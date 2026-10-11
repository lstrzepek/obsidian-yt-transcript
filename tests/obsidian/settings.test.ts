import type { SettingDefinitionControl } from "obsidian";

import {
	applySettingValue,
	buildSettingDefinitions,
	DEFAULT_SETTINGS,
	isOpenLocation,
	isSettingKey,
	OPEN_LOCATION_OPTIONS,
	validateTimestampMod,
	type YTranscriptSettings,
} from "src/obsidian/settings";

function freshSettings(): YTranscriptSettings {
	return { ...DEFAULT_SETTINGS };
}

describe("buildSettingDefinitions", () => {
	const definitions = buildSettingDefinitions() as SettingDefinitionControl[];

	it("defines exactly one control per stored setting", () => {
		const keys = definitions.map((d) => d.control.key).sort();
		expect(keys).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
	});

	it("gives every setting a name, description and search aliases", () => {
		for (const d of definitions) {
			expect(d.name).not.toBe("");
			expect(d.desc).toBeTruthy();
			expect(d.aliases?.length).toBeGreaterThan(0);
		}
	});

	it("uses the stored defaults as control defaults", () => {
		for (const d of definitions) {
			const key = d.control.key as keyof YTranscriptSettings;
			expect(d.control.defaultValue).toBe(DEFAULT_SETTINGS[key]);
		}
	});

	it("offers every open location in the dropdown", () => {
		const dropdown = definitions.find(
			(d) => d.control.key === "openLocation",
		);
		expect(dropdown?.control.type).toBe("dropdown");
		if (dropdown?.control.type !== "dropdown") return;
		expect(Object.keys(dropdown.control.options)).toEqual(
			Object.keys(OPEN_LOCATION_OPTIONS),
		);
	});

	it("validates the timestamp interval control", () => {
		const control = definitions.find(
			(d) => d.control.key === "timestampMod",
		)?.control;
		expect(control?.type).toBe("number");
		if (control?.type !== "number") return;
		expect(control.validate?.(0)).toBeTruthy();
		expect(control.validate?.(3)).toBeFalsy();
	});
});

describe("validateTimestampMod", () => {
	it.each([1, 5, 100])("accepts %p", (value) => {
		expect(validateTimestampMod(value)).toBeUndefined();
	});

	it.each([0, -1, 1.5, NaN, Infinity])("rejects %p", (value) => {
		expect(validateTimestampMod(value)).toEqual(expect.any(String));
	});
});

describe("isSettingKey / isOpenLocation", () => {
	it("recognises stored keys only", () => {
		expect(isSettingKey("lang")).toBe(true);
		expect(isSettingKey("leafUrls")).toBe(false);
		expect(isSettingKey("toString")).toBe(false);
	});

	it("recognises open locations only", () => {
		expect(isOpenLocation("tab")).toBe(true);
		expect(isOpenLocation("bottom")).toBe(false);
		expect(isOpenLocation(1)).toBe(false);
	});
});

describe("applySettingValue", () => {
	it("stores valid values", () => {
		const settings = freshSettings();
		expect(applySettingValue(settings, "timestampMod", 10)).toBe(true);
		expect(applySettingValue(settings, "lang", "de")).toBe(true);
		expect(applySettingValue(settings, "country", "PL")).toBe(true);
		expect(applySettingValue(settings, "openLocation", "split")).toBe(true);
		expect(settings).toEqual({
			timestampMod: 10,
			lang: "de",
			country: "PL",
			openLocation: "split",
		});
	});

	it.each([
		["timestampMod", 0],
		["timestampMod", NaN],
		["timestampMod", "10"],
		["lang", 42],
		["country", null],
		["openLocation", "bottom"],
		["unknownKey", "x"],
	])("rejects %s = %p and leaves settings untouched", (key, value) => {
		const settings = freshSettings();
		expect(applySettingValue(settings, key, value)).toBe(false);
		expect(settings).toEqual(DEFAULT_SETTINGS);
	});
});
