import { requestUrl } from "obsidian";
import type { HttpClient, HttpRequest } from "src/youtube/http";

export const obsidianHttp: HttpClient = {
	async request(req: HttpRequest): Promise<string> {
		const res = await requestUrl({
			url: req.url,
			method: req.method,
			headers: req.headers,
			body: req.body,
		});
		return res.text;
	},
};
