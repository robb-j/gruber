//
// This was loosely based on https://github.com/expressjs/cors/blob/master/lib/index.js
//
// Future work:
// - "allowedHeaders" to allow-list headers for request-headers
// - An option for "origins" to be dynamic so it could be pulled from a source like the database
// - An option to configure which methods are allowed
//

/**
 * @ignore
 *
 * Options for creating a {@link Cors} object with
 *
 * ```js
 * const options = {
 *   origins: ['http://localhost:8080'],
 *   credentials: true
 * }
 * ```
 */
export interface CorsOptions {
	/** Origins you want to be allowed to access this server or "*" for any server */
	origins?: string[];

	/** Whether to allow credentials in requests, default: false */
	credentials?: boolean;
}

/**
 * @unstable
 *
 * A development utility for apply CORS headers to a HTTP server using standard
 * [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
 * and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects.
 *
 * > This really **should not** be used in production, I built this with the intention that
 * > whatever reverse-proxy the app is deployed behind would manage these headers instead.
 *
 * This implementation was adapted from [expressjs/cors](https://github.com/expressjs/cors),
 * mostly to modernise it and remove features that weren't needed for this development-intended class.
 *
 * It will:
 *
 * - set `Access-Control-Allow-Methods` to all methods
 * - mirror headers in `Access-Control-Request-Headers` from the request
 * - properly set the `Vary` header for any request header that varies the response
 * - set `Access-Control-Allow-Origin` based on the `options.origins` option, allowing the origin if it is in the array or if the array includes `*`
 * - set `Access-Control-Allow-Credentials` if opted in through `options.credentials`
 *
 * ```js
 * const cors = new Cors({
 *   origins: ['http://localhost:8080'],
 *   credentials: true
 * })
 *
 * const request = new Request('http://localhost:3000/books/')
 * const response = Response.json({})
 *
 * const result = cors.apply(request, response)
 * ```
 */
export class Cors {
	origins: Set<string>;
	credentials: boolean;
	constructor(options: CorsOptions = {}) {
		this.credentials = options.credentials ?? false;
		this.origins = new Set(options.origins ?? ["*"]);
	}

	apply(request: Request, response: Response) {
		const headers = new Headers(response.headers);

		// HTTP methods
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods
		headers.set(
			"Access-Control-Allow-Methods",
			"GET, HEAD, PUT, PATCH, POST, DELETE",
		);

		// Headers
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Request-Headers
		if (request.headers.has("Access-Control-Request-Headers")) {
			headers.append(
				"Access-Control-Allow-Headers",
				request.headers.get("Access-Control-Request-Headers")!,
			);
			headers.append("Vary", "Access-Control-Request-Headers");
		}

		// Origins
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin
		if (this.origins.has("*")) {
			headers.set(
				"Access-Control-Allow-Origin",
				request.headers.get("origin") ?? "*",
			);
			headers.append("Vary", "Origin");
		} else if (
			request.headers.has("origin") &&
			this.origins.has(request.headers.get("origin")!)
		) {
			headers.set(
				"Access-Control-Allow-Origin",
				request.headers.get("origin")!,
			);
			headers.append("Vary", "Origin");
		}

		// Credentials
		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Credentials
		if (this.credentials) {
			headers.set("Access-Control-Allow-Credentials", "true");
		}

		return new Response(response.body, {
			headers,
			status: response.status,
			statusText: response.statusText,
		});
	}
}
