/** @typedef {import("./types.ts").HTTPMethod} HTTPMethod */
/** @typedef {import("./types.ts").RouteResult} RouteResult */

/**
 * @template {string} T
 * @typedef {import("./types.ts").ExtractRouteParams<T>} ExtractRouteParams */

/**
 * @template T
 * @typedef {import("./types.ts").RouteContext<T>} RouteContext
 */

/**
 * @template T
 * @typedef {import("./types.ts").RouteHandler<T>} RouteHandler
 */

/**
 * @template {string} T
 * @typedef {import("./types.ts").RouteOptions<T>} RouteOptions
 */

/**
 * @template [T]
 * @typedef {import("./types.ts").RouteDefinition<T>} RouteDefinition
 */

/**
 * @template {string} T
 * @param {RouteOptions<T>} init
 * @returns {RouteDefinition<T>}
 */
export function defineRoute(init) {
	return {
		method: init.method,
		pattern: new URLPattern({ pathname: init.pathname }),
		handler: init.handler,
	};
}

// NOTE: add more error codes as needed
// NOTE: design an API for setting the body on static errors
export class HTTPError extends Error {
	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400
	 * @param {BodyInit} [body]
	 */
	static badRequest(body = undefined) {
		return new HTTPError(400, "Bad Request", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
	 * @param {BodyInit} [body]
	 */
	static unauthorized(body = undefined) {
		return new HTTPError(401, "Unauthorized", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404
	 * @param {BodyInit} [body]
	 */
	static notFound(body = undefined) {
		return new HTTPError(404, "Not Found", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500
	 * @param {BodyInit} [body]
	 */
	static internalServerError(body = undefined) {
		return new HTTPError(500, "Internal Server Error", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501
	 * @param {BodyInit} [body]
	 */
	static notImplemented(body = undefined) {
		return new HTTPError(501, "Not Implemented", body);
	}

	/** @type {number} */ status;
	/** @type {string}*/ statusText;

	/**
	 * @param {number} status
	 * @param {string} statusText
	 * @param {BodyInit} [body=null]
	 */
	constructor(status = 200, statusText = "OK", body = undefined) {
		super(statusText);
		this.status = status;
		this.statusText = statusText;
		this.body = body;
		this.name = "HTTPError";
		Error.captureStackTrace(this, HTTPError);
	}

	toResponse() {
		return new Response(this.body, {
			status: this.status,
			statusText: this.statusText,
		});
	}
}
