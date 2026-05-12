const YOUTUBE_DOMAINS = new Set([
	"youtube.com",
	"www.youtube.com",
	"m.youtube.com",
	"mobile.youtube.com",
	"music.youtube.com",
	"youtube-nocookie.com",
	"www.youtube-nocookie.com",
	"youtu.be",
	"www.youtu.be",
]);

const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function isValidYouTubeUrl(url: string | null | undefined): boolean {
	if (!url || typeof url !== "string") return false;

	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return false;
	}

	const hostname = parsed.hostname.toLowerCase();
	if (!YOUTUBE_DOMAINS.has(hostname)) return false;

	if (hostname.endsWith("youtu.be")) {
		const [, videoId] = parsed.pathname.split("/");
		return VIDEO_ID_PATTERN.test(videoId ?? "");
	}

	if (parsed.pathname === "/watch") {
		return VIDEO_ID_PATTERN.test(parsed.searchParams.get("v") ?? "");
	}

	const pathMatch = parsed.pathname.match(
		/^\/(?:embed|shorts|v|live)\/([a-zA-Z0-9_-]{11})(?:\/|$)/,
	);
	return pathMatch !== null;
}

export function extractYouTubeUrlFromText(
	text: string | null | undefined,
): string | null {
	if (!text || typeof text !== "string") return null;

	const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
	const matches = text.match(urlRegex);
	if (!matches) return null;

	for (const match of matches) {
		if (isValidYouTubeUrl(match)) return match;
	}
	return null;
}

export function buildTimestampUrl(url: string, offsetMs: number): string {
	if (!url || typeof url !== "string") return "";

	try {
		const parsed = new URL(url);
		const seconds = Math.max(0, Math.floor(offsetMs / 1000));
		parsed.searchParams.set("t", seconds.toString());
		return parsed.toString();
	} catch {
		return url;
	}
}
