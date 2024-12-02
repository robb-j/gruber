import { Readable } from "node:stream";
import {
	createServer,
	IncomingHttpHeaders,
	IncomingMessage,
	RequestListener,
	ServerResponse,
} from "node:http";

import { FetchRouter } from "../core/fetch-router.ts";
import { RouteDefinition } from "../core/http.ts";
import { MaybePromise } from "../core/types.ts";

export interface NodeRouterOptions {
	routes?: RouteDefinition[];
}

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
	router: FetchRouter;
	constructor(options: NodeRouterOptions = {}) {
		this.router = new FetchRouter({
			routes: options.routes,
			errorHandler: (error, request) => this.onRouteError(error, request),
		});
	}

	getResponse(request: Request): Promise<Response> {
		return this.router.getResponse(request);
	}

	forHttpServer(): RequestListener {
		return async (req, res) => {
			const request = getFetchRequest(req);
			const response = await this.getResponse(request);
			this.respond(res, response);
		};
	}

	onRouteError(error: unknown, request: Request): void {
		console.error("Fatal Route Error", error);
	}

	respond(res: ServerResponse, response: Response): void {
		applyResponse(response, res);
	}
}

export function applyResponse(response: Response, res: ServerResponse): void {
	for (const [key, value] of response.headers) {
		const values = value.split(",");
		res.setHeader(key, values.length === 1 ? value : values);
	}

	res.writeHead(response.status, response.statusText);

	if (response.body) getResponseReadable(response).pipe(res);
	else res.end();
}

export function getFetchRequest(req: IncomingMessage) {
	const url = "http://" + (req.headers.host ?? "localhost") + req.url;
	return new Request(url, {
		method: req.method,
		headers: getFetchHeaders(req.headers),
		body: getIncomingMessageBody(req),
		// @ts-ignore
		duplex: "half",
	});
}

export function getFetchHeaders(input: IncomingHttpHeaders) {
	const result = new Headers();
	for (const [name, value] of Object.entries(input)) {
		if (Array.isArray(value)) for (const v of value) result.append(name, v);
		if (typeof value === "string") result.set(name, value);
	}
	return result;
}

const noHttpBody = new Set(["HEAD", "GET", "OPTIONS", "TRACE"]);

export function getIncomingMessageBody(
	req: IncomingMessage,
): BodyInit | undefined {
	if (!req.method) return undefined;
	if (noHttpBody.has(req.method)) return undefined;
	return Readable.toWeb(req) as ReadableStream;
}

export function getResponseReadable(response: Response) {
	// TODO: check this...
	return Readable.fromWeb(response.body as any);
}

/** @unstable */
export interface ServeHTTPOptions {
	port: number;
	hostname?: string;
}

/** @unstable */
export interface ServeHTTPHandler {
	(request: Request): MaybePromise<Response>;
}

/** @unstable A node version of Deno.serve now all the polyfills are in place */
export function serveHTTP(
	options: ServeHTTPOptions,
	handler: ServeHTTPHandler,
) {
	const http = createServer(async (httpReq, httpRes) => {
		const request = getFetchRequest(httpReq);
		const response = await handler(request);
		applyResponse(response, httpRes);
	});

	const server = http.listen(
		{ port: options.port, hostname: options.hostname },
		() => {
			console.log(
				"Listening on http://%s:%s",
				options.hostname ?? "0.0.0.0",
				options.port ?? 3000,
			);
		},
	);

	// NOTE: AbortSignal?
	// NOTE: maybe embed/depend on stoppable ~ https://github.com/hunterloftis/stoppable/blob/master/lib/stoppable.js

	return server;
}
