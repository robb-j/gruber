/**
 * @group HTTPError
 *
 * A custom [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
 * subclass that represents an HTTP error to be returned to the user.
 *
 * This allows code to throw specific HTTP errors directly.
 *
 * > NOTE: add more error codes as needed
 *
 * You can use well-known errors like below, you can also pass a [BodyInit](https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#body) to customise the response body.
 *
 * ```js
 * throw HTTPError.badRequest()
 * throw HTTPError.unauthorized()
 * throw HTTPError.notFound()
 * throw HTTPError.internalServerError()
 * throw HTTPError.notImplemented()
 * ```
 *
 * You can also manually construct the error:
 *
 * ```js
 * const teapot = new HTTPError(418, "I'm a teapot");
 * ```
 */
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

	/** The HTTP status to return ~ [status](https://developer.mozilla.org/en-US/docs/Web/API/Response/status) */
	status: number;

	/** The status text to return ~ [statusText](https://developer.mozilla.org/en-US/docs/Web/API/Response/statusText) */
	statusText: string;

	/** A custom body to send to the client */
	body: BodyInit | undefined;

	/** Extra headers to send to the client */
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
