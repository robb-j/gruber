//
// This was loosely based on https://github.com/expressjs/cors/blob/master/lib/index.js
//
// Future work:
// - "allowedHeaders" to allow-list headers for request-headers
// - An option for "origins" to be dynamic so it could be pulled from a source like the database
// - An option to configure which methods are allowed
//

//
interface CorsOptions {
	/** Origins you want to be allowed to access this server or "*" for any server */
	origins?: string[];

	/** Whether to allow credentials in requests, default: false */
	credentials?: boolean;
}

/** @unstable */
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
