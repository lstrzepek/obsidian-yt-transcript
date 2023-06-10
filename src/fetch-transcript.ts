import { request, requestUrl } from "obsidian";
const YOUTUBE_TITLE_REGEX = new RegExp(
	/<meta\s+name="title"\s+content="([^"]*)">/
);
export class YoutubeTranscriptError extends Error {
	constructor(err: unknown) {
		if (!(err instanceof Error)) {
			super("");
			return;
		}

		if (err.message.includes("ERR_INVALID_URL")) {
			super("Invalid YouTube URL");
		} else {
			super(err.message);
		}
	}
}

export interface TranscriptConfig {
	lang?: string;
	country?: string;
}

export interface TranscriptResponse {
	title: string;
	lines: TranscriptLine[];
}

export interface TranscriptLine {
	text: string;
	duration: number;
	offset: number;
}

export class YoutubeTranscript {
	public static async fetchTranscript(
		url: string,
		config?: TranscriptConfig
	) {
		try {
			const videoPageBody = await request(url);
			const titleMatch = videoPageBody.match(YOUTUBE_TITLE_REGEX);
			let title = "";
			if (titleMatch) title = titleMatch[1];

			const innerTubeApiKey = videoPageBody
				.split('"INNERTUBE_API_KEY":"')[1]
				.split('"')[0];
			if (innerTubeApiKey && innerTubeApiKey.length > 0) {
				const response = await requestUrl({
					url: `https://www.youtube.com/youtubei/v1/get_transcript?key=${innerTubeApiKey}`,
					method: "POST",
					body: JSON.stringify(
						this.generateRequest(videoPageBody.toString(), config)
					),
				});
				const body = response.json;
				if (body.responseContext) {
					if (!body.actions) {
						throw new Error("Transcript is disabled on this video");
					}
					const transcripts =
						body.actions[0].updateEngagementPanelAction.content
							.transcriptRenderer.body.transcriptBodyRenderer
							.cueGroups;

					return {
						title: title,
						lines: transcripts.map((cue: any) => ({
							text: cue.transcriptCueGroupRenderer.cues[0]
								.transcriptCueRenderer.cue.simpleText,
							duration: parseInt(
								cue.transcriptCueGroupRenderer.cues[0]
									.transcriptCueRenderer.durationMs
							),
							offset: parseInt(
								cue.transcriptCueGroupRenderer.cues[0]
									.transcriptCueRenderer.startOffsetMs
							),
						})),
					};
				}
			}
		} catch (err: any) {
			throw new YoutubeTranscriptError(err);
		}
	}
	/**
	 * Generate tracking params for YTB API
	 * @param page
	 * @param config
	 */
	private static generateRequest(page: string, config?: TranscriptConfig) {
		const params = page
			.split('"serializedShareEntity":"')[1]
			?.split('"')[0];
		const visitorData = page.split('"VISITOR_DATA":"')[1]?.split('"')[0];
		const sessionId = page.split('"sessionId":"')[1]?.split('"')[0];
		let clickTrackingParams = page
			?.split('"clickTrackingParams":"')[1]
			?.split('"')[0];

		//youtu.be links have extra characters in clickTrackingParams that are not supported
		//with the youtubei api
		clickTrackingParams = clickTrackingParams.slice(0, 28);
		return {
			context: {
				client: {
					hl: config?.lang || "fr",
					gl: config?.country || "FR",
					visitorData,
					userAgent:
						"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)",
					clientName: "WEB",
					clientVersion: "2.20200925.01.00",
					osName: "Macintosh",
					osVersion: "10_15_4",
					browserName: "Chrome",
					browserVersion: "85.0f.4183.83",
					screenWidthPoints: 1440,
					screenHeightPoints: 770,
					screenPixelDensity: 2,
					utcOffsetMinutes: 120,
					userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
					connectionType: "CONN_CELLULAR_3G",
				},
				request: {
					sessionId,
					internalExperimentFlags: [],
					consistencyTokenJars: [],
				},
				user: {},
				clientScreenNonce: this.generateNonce(),
				clickTracking: {
					clickTrackingParams: decodeURI(clickTrackingParams),
				},
			},
			params,
		};
	}

	/**
	 *  'base.js' function
	 */
	private static generateNonce() {
		const rnd = Math.random().toString();
		const alphabet =
			"ABCDEFGHIJKLMOPQRSTUVWXYZabcdefghjijklmnopqrstuvwxyz0123456789";
		const jda = [
			alphabet + "+/=",
			alphabet + "+/",
			alphabet + "-_=",
			alphabet + "-_.",
			alphabet + "-_",
		];
		const b = jda[3];
		const a = [];
		for (let i = 0; i < rnd.length - 1; i++) {
			a.push(rnd[i].charCodeAt(i));
		}
		let c = "";
		let d = 0;
		let m, n, q, r, f, g;
		while (d < a.length) {
			f = a[d];
			g = d + 1 < a.length;

			if (g) {
				m = a[d + 1];
			} else {
				m = 0;
			}
			n = d + 2 < a.length;
			if (n) {
				q = a[d + 2];
			} else {
				q = 0;
			}
			r = f >> 2;
			f = ((f & 3) << 4) | (m >> 4);
			m = ((m & 15) << 2) | (q >> 6);
			q &= 63;
			if (!n) {
				q = 64;
				if (!q) {
					m = 64;
				}
			}
			c += b[r] + b[f] + b[m] + b[q];
			d += 3;
		}
		return c;
	}
}
