import { parseTranscriptXml } from "src/transcript/parse-xml";

describe("parseTranscriptXml", () => {
	it("should parse <text> tag format", () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
			<transcript>
				<text start="0.5" dur="2.5">Hello world</text>
				<text start="3.0" dur="1.5">This is a test</text>
			</transcript>
		`;

		const lines = parseTranscriptXml(xml);
		expect(lines).toHaveLength(2);
		expect(lines[0].text).toBe("Hello world");
		expect(lines[0].offset).toBe(500);
		expect(lines[0].duration).toBe(2500);
		expect(lines[1].text).toBe("This is a test");
		expect(lines[1].offset).toBe(3000);
	});

	it("should parse <p> tag format", () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
			<timedtext>
				<p t="500" d="2500">Hello world</p>
				<p t="3000" d="1500">This is a test</p>
			</timedtext>
		`;

		const lines = parseTranscriptXml(xml);
		expect(lines).toHaveLength(2);
		expect(lines[0].text).toBe("Hello world");
		expect(lines[0].offset).toBe(500);
		expect(lines[0].duration).toBe(2500);
	});

	it("should decode HTML entities", () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
			<transcript>
				<text start="0" dur="1">Tom &amp; Jerry</text>
				<text start="1" dur="1">&lt;script&gt; tag</text>
				<text start="2" dur="1">Say &quot;hello&quot;</text>
				<text start="3" dur="1">It&#39;s fine</text>
			</transcript>
		`;

		const lines = parseTranscriptXml(xml);
		expect(lines[0].text).toBe("Tom & Jerry");
		expect(lines[1].text).toBe("<script> tag");
		expect(lines[2].text).toBe('Say "hello"');
		expect(lines[3].text).toBe("It's fine");
	});

	it("should strip HTML tags from text content", () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
			<transcript>
				<text start="0" dur="1">Hello <font color="#AAAAAA">world</font></text>
			</transcript>
		`;

		const lines = parseTranscriptXml(xml);
		expect(lines[0].text).toBe("Hello world");
	});

	it("should return empty array for empty XML", () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
			<transcript></transcript>
		`;

		const lines = parseTranscriptXml(xml);
		expect(lines).toHaveLength(0);
	});

	it("should skip empty text entries", () => {
		const xml = `<?xml version="1.0" encoding="utf-8" ?>
			<transcript>
				<text start="0" dur="1">Hello</text>
				<text start="1" dur="1">   </text>
				<text start="2" dur="1">World</text>
			</transcript>
		`;

		const lines = parseTranscriptXml(xml);
		expect(lines).toHaveLength(2);
		expect(lines[0].text).toBe("Hello");
		expect(lines[1].text).toBe("World");
	});
});
