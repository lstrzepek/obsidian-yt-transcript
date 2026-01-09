import {
	extractVideoId,
	extractVideoTitle,
	getCaptionTracksFromPlayer,
	getCaptionTracksFromPage,
	parseTranscriptXml,
} from "../src/api-parser";

describe("extractVideoTitle", () => {
	it("should extract title from YouTube page HTML", () => {
		const html = `
			<html>
			<head>
				<meta name="title" content="Test Video Title">
			</head>
			</html>
		`;
		expect(extractVideoTitle(html)).toBe("Test Video Title");
	});

	it("should return empty string when title not found", () => {
		const html = "<html><head></head></html>";
		expect(extractVideoTitle(html)).toBe("");
	});
});

describe("extractVideoId", () => {
	it("should extract video ID from canonical URL", () => {
		const html = `
			<html>
			<head>
				<link rel="canonical" href="https://www.youtube.com/watch?v=rOSZOCoqOo8">
			</head>
			</html>
		`;
		expect(extractVideoId(html)).toBe("rOSZOCoqOo8");
	});

	it("should extract video ID from videoId JSON property", () => {
		const html = `
			<script>
				var ytInitialData = {"videoId": "sLgHqZSe2o0"};
			</script>
		`;
		expect(extractVideoId(html)).toBe("sLgHqZSe2o0");
	});

	it("should extract video ID from watch URL pattern", () => {
		const html = `
			<a href="https://www.youtube.com/watch?v=kNNGOrJDdO8">Link</a>
		`;
		expect(extractVideoId(html)).toBe("kNNGOrJDdO8");
	});

	it("should return null when no video ID found", () => {
		const html = "<html><head></head></html>";
		expect(extractVideoId(html)).toBeNull();
	});
});

describe("getCaptionTracksFromPlayer", () => {
	it("should extract caption tracks from player data", () => {
		const playerData = {
			captions: {
				playerCaptionsTracklistRenderer: {
					captionTracks: [
						{
							baseUrl: "https://www.youtube.com/api/timedtext?lang=en",
							name: { simpleText: "English" },
							languageCode: "en",
							isTranslatable: true,
						},
						{
							baseUrl: "https://www.youtube.com/api/timedtext?lang=es",
							name: { simpleText: "Spanish" },
							languageCode: "es",
							isTranslatable: true,
						},
					],
				},
			},
		};

		const tracks = getCaptionTracksFromPlayer(playerData);
		expect(tracks).toHaveLength(2);
		expect(tracks[0].languageCode).toBe("en");
		expect(tracks[0].name).toBe("English");
		expect(tracks[1].languageCode).toBe("es");
	});

	it("should prioritize preferred language", () => {
		const playerData = {
			captions: {
				playerCaptionsTracklistRenderer: {
					captionTracks: [
						{
							baseUrl: "https://example.com/en",
							name: { simpleText: "English" },
							languageCode: "en",
							isTranslatable: true,
						},
						{
							baseUrl: "https://example.com/es",
							name: { simpleText: "Spanish" },
							languageCode: "es",
							isTranslatable: true,
						},
					],
				},
			},
		};

		const tracks = getCaptionTracksFromPlayer(playerData, "es");
		expect(tracks[0].languageCode).toBe("es");
	});

	it("should return empty array when no captions available", () => {
		const playerData = { captions: null };
		const tracks = getCaptionTracksFromPlayer(playerData);
		expect(tracks).toHaveLength(0);
	});

	it("should handle name with runs array format", () => {
		const playerData = {
			captions: {
				playerCaptionsTracklistRenderer: {
					captionTracks: [
						{
							baseUrl: "https://example.com/en",
							name: { runs: [{ text: "English (auto-generated)" }] },
							languageCode: "en",
							isTranslatable: false,
						},
					],
				},
			},
		};

		const tracks = getCaptionTracksFromPlayer(playerData);
		expect(tracks[0].name).toBe("English (auto-generated)");
	});
});

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

describe("getCaptionTracksFromPage", () => {
	it("should extract caption tracks from ytInitialPlayerResponse", () => {
		const html = `
			<script>
				var ytInitialPlayerResponse = {
					"captions": {
						"playerCaptionsTracklistRenderer": {
							"captionTracks": [
								{
									"baseUrl": "https://www.youtube.com/api/timedtext?lang=en",
									"name": {"simpleText": "English"},
									"languageCode": "en",
									"isTranslatable": true
								},
								{
									"baseUrl": "https://www.youtube.com/api/timedtext?lang=es",
									"name": {"simpleText": "Spanish"},
									"languageCode": "es",
									"isTranslatable": true
								}
							]
						}
					}
				};
			</script>
		`;

		const tracks = getCaptionTracksFromPage(html);
		expect(tracks).toHaveLength(2);
		expect(tracks[0].languageCode).toBe("en");
		expect(tracks[0].name).toBe("English");
		expect(tracks[1].languageCode).toBe("es");
	});

	it("should prioritize preferred language", () => {
		const html = `
			<script>
				var ytInitialPlayerResponse = {
					"captions": {
						"playerCaptionsTracklistRenderer": {
							"captionTracks": [
								{
									"baseUrl": "https://example.com/en",
									"name": {"simpleText": "English"},
									"languageCode": "en"
								},
								{
									"baseUrl": "https://example.com/es",
									"name": {"simpleText": "Spanish"},
									"languageCode": "es"
								}
							]
						}
					}
				};
			</script>
		`;

		const tracks = getCaptionTracksFromPage(html, "es");
		expect(tracks[0].languageCode).toBe("es");
	});

	it("should return empty array when no captions in page", () => {
		const html = `
			<script>
				var ytInitialPlayerResponse = {
					"playabilityStatus": {"status": "OK"}
				};
			</script>
		`;

		const tracks = getCaptionTracksFromPage(html);
		expect(tracks).toHaveLength(0);
	});

	it("should return empty array when no ytInitialPlayerResponse", () => {
		const html = "<html><body></body></html>";
		const tracks = getCaptionTracksFromPage(html);
		expect(tracks).toHaveLength(0);
	});
});
