const YOUTUBE_DOMAINS = new Set([
	"youtube.com",
	"www.youtube.com",
	"m.youtube.com",
	"mobile.youtube.com",
	"music.youtube.com",
	"youtu.be",
	"www.youtu.be",
]);

export interface YouTubeTimeRange {
	startMs?: number;
	endMs?: number;
}

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

	if (hostname.endsWith("youtube.com")) {
		return parsed.pathname === "/watch" && parsed.searchParams.has("v");
	}
	if (hostname.endsWith("youtu.be")) {
		const [, videoId] = parsed.pathname.split("/");
		return !!videoId;
	}
	return false;
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

export function extractYouTubeTimeRange(url: string): YouTubeTimeRange {
	if (!url || typeof url !== "string") return {};

	try {
		const parsed = new URL(url);
		const startSeconds = parseTimestampSeconds(
			parsed.searchParams.get("start") ?? parsed.searchParams.get("t"),
		);
		const endSeconds = parseTimestampSeconds(parsed.searchParams.get("end"));
		const hashTimestampSeconds = parseTimestampSeconds(
			parsed.hash.startsWith("#t=") ? parsed.hash.slice(3) : null,
		);

		const startMs = toMilliseconds(startSeconds ?? hashTimestampSeconds);
		const endMs = toMilliseconds(endSeconds);

		if (
			startMs !== undefined &&
			endMs !== undefined &&
			endMs <= startMs
		) {
			return { startMs };
		}

		return { startMs, endMs };
	} catch {
		return {};
	}
}

function parseTimestampSeconds(value: string | null): number | undefined {
	if (!value) return undefined;
	const normalized = value.trim();
	if (normalized.length === 0) return undefined;

	if (/^\d+(\.\d+)?$/.test(normalized)) {
		const numeric = Number.parseFloat(normalized);
		return Number.isFinite(numeric) ? numeric : undefined;
	}

	if (normalized.includes(":")) {
		const parts = normalized.split(":");
		if (parts.length < 2 || parts.length > 3) return undefined;
		if (!parts.every((part) => /^\d+$/.test(part))) return undefined;

		const numbers = parts.map((part) => Number.parseInt(part, 10));
		if (parts.length === 2) {
			const [minutes, seconds] = numbers;
			return minutes * 60 + seconds;
		}
		const [hours, minutes, seconds] = numbers;
		return hours * 3600 + minutes * 60 + seconds;
	}

	const unitMatch = normalized.match(
		/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s?)?$/i,
	);
	if (!unitMatch) return undefined;
	const [, hoursPart, minutesPart, secondsPart] = unitMatch;
	if (!hoursPart && !minutesPart && !secondsPart) return undefined;

	const hours = hoursPart ? Number.parseInt(hoursPart, 10) : 0;
	const minutes = minutesPart ? Number.parseInt(minutesPart, 10) : 0;
	const seconds = secondsPart ? Number.parseFloat(secondsPart) : 0;

	const total = hours * 3600 + minutes * 60 + seconds;
	return Number.isFinite(total) ? total : undefined;
}

function toMilliseconds(seconds: number | undefined): number | undefined {
	if (seconds === undefined) return undefined;
	if (seconds < 0) return undefined;
	return Math.floor(seconds * 1000);
}
