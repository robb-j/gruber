// NOTE: add more error codes as needed
export class HTTPError extends Error {
	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400
	 */
	static badRequest(body: BodyInit | undefined = undefined) {
		return new HTTPError(400, "Bad Request", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
	 */
	static unauthorized(body: BodyInit | undefined = undefined) {
		return new HTTPError(401, "Unauthorized", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404
	 */
	static notFound(body: BodyInit | undefined = undefined) {
		return new HTTPError(404, "Not Found", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500
	 */
	static internalServerError(body: BodyInit | undefined = undefined) {
		return new HTTPError(500, "Internal Server Error", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501
	 */
	static notImplemented(body: BodyInit | undefined = undefined) {
		return new HTTPError(501, "Not Implemented", body);
	}

	status: number;
	statusText: string;
	body: BodyInit | undefined;
	headers: Headers | undefined;

	constructor(
		status: number = 200,
		statusText: string = "OK",
		body: BodyInit | undefined = undefined,
		headers: HeadersInit | undefined = undefined,
	) {
		super(statusText);
		this.status = status;
		this.statusText = statusText;
		this.body = body;
		this.name = "HTTPError";
		this.headers = new Headers(headers);
		Error.captureStackTrace(this, HTTPError);
	}

	toResponse() {
		return new Response(this.body, {
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
		});
	}
}
