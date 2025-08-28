/**
 * @group HTTPError
 *
 * A custom [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
 * subclass that represents an HTTP error to be returned to the user.
 *
 * This allows routes to throw specific HTTP errors directly and
 * {@link FetchRouter} knows how to handle them and turn them into HTTP Responses
 *
 *
 *
 * You can use well-known errors like below, you can also pass a [BodyInit](https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#body) to customise the response body.
 *
 * ```js
 * throw HTTPError.badRequest()
 * throw HTTPError.unauthorized()
 * throw HTTPError.notFound()
 * throw HTTPError.internalServerError()
 * throw HTTPError.notImplemented()
 *
 * // The plan is to add more error well-known codes as they are needed
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
	 * [400 Bad Request](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400)
	 *
	 * ```js
	 * throw HTTPError.badRequest()
	 * ```
	 */
	static badRequest(body: BodyInit | undefined = undefined) {
		return new HTTPError(400, "Bad Request", body);
	}

	/**
	 * [401 Unauthorized](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401)
	 *
	 * ```js
	 * throw HTTPError.unauthorized()
	 * ```
	 */
	static unauthorized(body: BodyInit | undefined = undefined) {
		return new HTTPError(401, "Unauthorized", body);
	}

	/**
	 * [404 Not Found](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404)
	 *
	 * ```js
	 * throw HTTPError.notFound()
	 * ```
	 */
	static notFound(body: BodyInit | undefined = undefined) {
		return new HTTPError(404, "Not Found", body);
	}

	/**
	 * [500 Internal Server Error](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500)
	 *
	 * ```js
	 * throw HTTPError.internalServerError()
	 * ```
	 */
	static internalServerError(body: BodyInit | undefined = undefined) {
		return new HTTPError(500, "Internal Server Error", body);
	}

	/**
	 * [500 Not Implemented](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501)
	 *
	 * ```js
	 * throw HTTPError.notImplemented()
	 * ```
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

	/**
	 * Convert the HTTPError into a HTTP `Response` object
	 * taking into account the `status`, `statusText` and `headers` fields on the error.
	 *
	 * ```js
	 * const error = new HTTPError(418, "I'm a teapot");
	 *
	 * error.toResponse() // Response
	 * ```
	 */
	toResponse() {
		return new Response(this.body, {
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
		});
	}
}
