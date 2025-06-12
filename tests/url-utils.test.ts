import { getUrlFromText } from "../src/url-utils";

describe("Should return position of the url in text line", () => {
	test("When cursor in the middle of the url", () => {
		expect(
			getUrlFromText("https://www.youtube.com/watch?v=rOSZOCoqOo8", 39),
		).toStrictEqual([0, 43]);
	});
	test("When cursor at the end of the url", () => {
		expect(
			getUrlFromText("https://www.youtube.com/watch?v=rOSZOCoqOo8", 43),
		).toStrictEqual([0, 43]);
	});
	test("When cursor at the beginig of the url", () => {
		expect(
			getUrlFromText("https://www.youtube.com/watch?v=rOSZOCoqOo8", 0),
		).toStrictEqual([0, 43]);
	});
	test("When cursor at the begginning of the line with single url", () => {
		expect(
			getUrlFromText(
				"This is my favourite youtube video https://www.youtube.com/watch?v=rOSZOCoqOo8",
				0,
			),
		).toStrictEqual([35, 78]);
	});
	test("When cursor at the end of the line with single url", () => {
		expect(
			getUrlFromText(
				"This is my favourite youtube video https://www.youtube.com/watch?v=rOSZOCoqOo8 and I'm watching it over and over.",
				113,
			),
		).toStrictEqual([35, 78]);
	});
});

describe("Should return position of the url in markdown line", () => {
	test("When cursor in the middle of the url", () => {
		expect(
			getUrlFromText(
				"(Link)[https://www.youtube.com/watch?v=rOSZOCoqOo8]",
				39,
			),
		).toStrictEqual([7, 51]);
	});
	test("When cursor at the end of the url", () => {
		expect(
			getUrlFromText(
				"(Link)[https://www.youtube.com/watch?v=rOSZOCoqOo8]",
				51,
			),
		).toStrictEqual([7, 51]);
	});
	test("When cursor at the beginig of the url", () => {
		expect(
			getUrlFromText(
				"(Link)[https://www.youtube.com/watch?v=rOSZOCoqOo8]",
				7,
			),
		).toStrictEqual([7, 51]);
	});
});
