import { Readable } from "node:stream";
import { FetchRouter } from "../../core/mod.js";

/** @typedef {import("../../core/mod.js").RouteDefinition} RouteDefinition */

/**
	@typedef {object} NodeRouterOptions
	@property {RouteDefinition []} routes
	*/

/**
	A HTTP router for Node.js, powered by Koa

	```js
	import http from "node:http";

	const router = new NodeRouter(...)
	const server = http.createServer(router.forHttpServer())
	server.listen(3000)
	```
*/
export class NodeRouter {
	/** @param {NodeRouterOptions} options */
	constructor(options = {}) {
		this.router = new FetchRouter(options.routes ?? []);
	}

	/** @param {Request} request */
	getResponse(request) {
		return this.router.getResponse(request);
	}

	forHttpServer() {
		return async (req, res) => {
			const request = getFetchRequest(req);
			const response = await this.getResponse(request);
			this.respond(res, response);
		};
	}

	/**
		@param {import("node:http").ServerResponse} res
		@param {Response} response
	*/
	respond(res, response) {
		res.statusCode = response.status;
		res.statusMessage = response.statusText;

		for (const [key, value] of response.headers) {
			const values = value.split(",");
			res.setHeader(key, values.length === 1 ? value : values);
		}

		if (response.body) Readable.fromWeb(response.body).pipe(res);
		else res.end();
	}
}

/** @param {import("node:http").IncomingMessage} req */
export function getFetchRequest(req) {
	const url = "http://" + (req.headers.host ?? "localhost") + req.url;
	return new Request(url, {
		method: req.method,
		headers: getFetchHeaders(req.headers),
		body: getIncomingMessageBody(req),
	});
}

/** @param {import("node:http").IncomingHttpHeaders} input */
export function getFetchHeaders(input) {
	const result = new Headers();
	for (const [name, value] of Object.entries(input)) {
		if (Array.isArray(value)) for (const v of value) result.append(name, v);
		if (typeof value === "string") result.set(name, value);
	}
	return result;
}

/** @param {import("node:http").IncomingMessage} req */
export function getIncomingMessageBody(req) {
	if (req.method === "HEAD" || req.method === "GET") return undefined;
	return Readable.toWeb(req);
}
