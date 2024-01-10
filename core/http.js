/**
 * @typedef {"GET"|"HEAD"|"POST"|"PUT"|"PATCH"|"DELETE"|"CONNECT"} HTTPMethod
 */

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
// NOTE: design an API for setting the body on static errors
export class HTTPError extends Error {
	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400 */
	static badRequest() {
		return new HTTPError(400, "Bad Request");
	}

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401 */
	static unauthorized() {
		return new HTTPError(401, "Unauthorized");
	}

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404 */
	static notFound() {
		return new HTTPError(404, "Not Found");
	}

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500 */
	static internalServerError() {
		return new HTTPError(500, "Internal Server Error");
	}

	/** https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501 */
	static notImplemented() {
		return new HTTPError(501, "Not Implemented");
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
		this.name = "HTTPError";
		Error.captureStackTrace(this, HTTPError);
	}

	toResponse() {
		return new Response(null, {
			status: this.status,
			statusText: this.statusText,
		});
	}
}
