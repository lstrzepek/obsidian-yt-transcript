import { getUrlFromText } from "./url-utils";

describe("Should return position of the url in text line", () => {
	test("When cursor in the middle of the url", () => {
		expect(
			getUrlFromText("https://www.youtube.com/watch?v=rOSZOCoqOo8", 39)
		).toStrictEqual([0, 43]);
	});
	test("When cursor at the end of the url", () => {
		expect(
			getUrlFromText("https://www.youtube.com/watch?v=rOSZOCoqOo8", 43)
		).toStrictEqual([0, 43]);
	});
	test("When cursor at the beginig of the url", () => {
		expect(
			getUrlFromText("https://www.youtube.com/watch?v=rOSZOCoqOo8", 0)
		).toStrictEqual([0, 43]);
	});
});

describe("Should return position of the url in markdown line", () => {
	test("When cursor in the middle of the url", () => {
		expect(
			getUrlFromText(
				"(Link)[https://www.youtube.com/watch?v=rOSZOCoqOo8]",
				39
			)
		).toStrictEqual([7, 51]);
	});
	test("When cursor at the end of the url", () => {
		expect(
			getUrlFromText(
				"(Link)[https://www.youtube.com/watch?v=rOSZOCoqOo8]",
				51
			)
		).toStrictEqual([7, 51]);
	});
	test("When cursor at the beginig of the url", () => {
		expect(
			getUrlFromText(
				"(Link)[https://www.youtube.com/watch?v=rOSZOCoqOo8]",
				7
			)
		).toStrictEqual([7, 51]);
	});
});
