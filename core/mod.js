/** @typedef {"GET"|"HEAD"|"POST"|"PUT"|"PATCH"|"DELETE"|"CONNECT"|""} HTTPMethod */

/**
 * @typedef {object} RouteContext
 * @property {Request} request
 * @property {URL} url
 * @property {Record<string, string>} params
 */

/**
 * @typedef {(context: RouteContext) => Response | Promise<Response>} RouteHandler
 */

/**
 * @typedef {object} RouteOptions
 * @property {HTTPMethod} method
 * @property {pathname} pathname
 * @property {RouteHandler} handler
 */

/**
 * @typedef {object} RouteDefinition
 * @property {HTTPMethod} method
 * @property {URLPattern} pattern
 * @property {RouteHandler} handler
 */

/**
 * @param {RouteOptions} options
 * @returns {RouteDefinition}
 */
export function defineRoute(options) {
	return {
		method: options.method,
		pattern: new URLPattern({ pathname: options.pathname }),
		handler: options.handler,
	};
}

// NOTE: add more error codes as needed
export class HttpError extends Error {
	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400 */
	static badRequest() {
		return new HttpError(400, "Bad Request");
	}

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401 */
	static unauthorized() {
		return new HttpError(401, "Unauthorized");
	}

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404 */
	static notFound() {
		return new HttpError(404, "Not Found");
	}

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500 */
	static internalServerError() {
		return new HttpError(500, "Internal Server Error");
	}

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501 */
	static notImplemented() {
		return new HttpError(501, "Not Implemented");
	}

	/** @type {number} */ status;
	/** @type {string}*/ statusText;

	/**
	 * @param {number} status
	 * @param {string} statusText
	 */
	constructor(status = 200, statusText = "OK") {
		super(statusText);
		this.status = status;
		this.statusText = statusText;
		this.name = "HttpError";
		Error.captureStackTrace(this, HttpError);
	}

	toResponse() {
		return new Response(this.statusText, {
			status: this.status,
			statusText: this.statusText,
		});
	}
}

/** A rudimentary HTTP router based on fetch Request & Responses and RouteDefinions based on URLPattern */
export class FetchRouter {
	routes /** @type {RouteDefinition} */;

	/** @param {RouteDefinition[]} routes */
	constructor(routes) {
		this.routes = routes;
	}

	/** @param {Request} request */
	async getResponse(request) {
		try {
			// Finds routes that match the request method and URLPattern
			// and get's the matched parameters and parsed URL
			const matches = this.routes
				.filter((route) => route.method === request.method)
				.map((route) => {
					const url = new URL(request.url);
					const match = route.pattern.exec(request.url);
					return { match, route, url };
				})
				.filter((item) => item.match);

			// Go through each route match and try to get a Response
			for (const { route, match, url } of matches) {
				const response = await route.handler({
					request,
					url,
					params: match.pathname.groups,
				});
				// NOTE: could emit request/response for logging?
				if (response instanceof Response) return response;
				if (response) throw new Error("Invalid Route Response");
			}

			throw HttpError.notFound();
		} catch (error) {
			// Get or create a HTTP error based on the one thrown
			const httpError =
				error instanceof HttpError ? error : HttpError.internalServerError();

			// NOTE: could emit the error
			if (httpError.status >= 500) console.error("FetchRouter error:", error);

			return httpError.toResponse();
		}
	}
}
