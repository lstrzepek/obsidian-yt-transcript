export interface HttpRequest {
	url: string;
	method: "GET" | "POST";
	headers?: Record<string, string>;
	body?: string;
}

export interface HttpClient {
	request(req: HttpRequest): Promise<string>;
}
