import { Readable } from "node:stream";
import {
	createServer,
	type IncomingHttpHeaders,
	type IncomingMessage,
	type RequestListener,
	ServerResponse,
	Server,
} from "node:http";
import { Socket } from "node:net";

import { FetchRouter } from "../http/fetch-router.ts";
import { type RouteDefinition } from "../http/define-route.ts";
import { type MaybePromise } from "../core/types.ts";

export interface NodeRouterOptions {
	routes?: RouteDefinition<any, any>[];
}

/**
 * @hidden
 *
 * A HTTP router for pure Node.js, you should probably use {@link serveHTTP}
 *
 * ```js
 * import http from "node:http";
 *
 * const router = new NodeRouter(…)
 * const server = http.createServer(router.forHttpServer())
 * server.listen(3000)
 * ```
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

/**
 * @group HTTP
 *
 * Send a web-standards Response to a Node.js [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse)
 *
 * ```js
 * import http from "node:http"
 *
 * http.createServer((req, res) => {
 * 	applyResponse(
 * 		Response.json({ msg: "ok" }),
 * 		res
 * 	)
 * })
 * ```
 */
export function applyResponse(response: Response, res: ServerResponse): void {
	for (const [key, value] of response.headers) {
		res.appendHeader(key, value);
	}

	res.writeHead(response.status, response.statusText);

	if (response.body) getResponseReadable(response, res).pipe(res);
	else res.end();
}

/**
 * @group HTTP
 *
 * Convert a Node.js [IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage) into a
 * web-standards [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
 *
 * ```js
 * import http from "node:http"
 *
 * http.createServer((req, res) => {
 * 	let request = getFetchRequest(req)
 * 	// ...
 * })
 * ```
 */
export function getFetchRequest(req: IncomingMessage) {
	const url = "http://" + (req.headers.host ?? "localhost") + req.url;
	const ac = new AbortController();
	req.once("error", (e) => ac.abort(e));
	return new Request(url, {
		method: req.method,
		headers: getFetchHeaders(req.headers),
		body: getIncomingMessageBody(req),
		// @ts-ignore
		duplex: "half",
		signal: ac.signal,
	});
}

/**
 * @group HTTP
 *
 * Parse Node.js IncomingHttpHeaders into a web-standards [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) object
 *
 * ```js
 * const headers = getFetchHeaders({ accept: "text/plain" }) // Headers
 * ```
 */
export function getFetchHeaders(input: IncomingHttpHeaders) {
	const result = new Headers();
	for (const [name, value] of Object.entries(input)) {
		if (Array.isArray(value)) for (const v of value) result.append(name, v);
		if (typeof value === "string") result.set(name, value);
	}
	return result;
}

const noHttpBody = new Set(["HEAD", "GET", "OPTIONS", "TRACE"]);

/**
 * @group HTTP
 *
 * Convert the body of a Node.js [IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage) into a Streams API ReadableStream
 *
 * ```js
 * import http from "node:http"
 *
 * http.createServer((req, res) => {
 * 	let stream = getIncomingMessageBody(req)
 * 	// ...
 * })
 * ```
 */
export function getIncomingMessageBody(
	req: IncomingMessage,
): BodyInit | undefined {
	if (!req.method) return undefined;
	if (noHttpBody.has(req.method)) return undefined;
	return Readable.toWeb(req) as ReadableStream;
}

/**
 * @group HTTP
 *
 * Convert a Streams API ReadableStream into a Readable to later be piped to a Node.js [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse)
 *
 * ```js
 * import http from "node:http"
 *
 * http.createServer((req, res) => {
 * 	const webResponse = Response.json({ msg: "OK" })
 * 	getResponseReadable(webResponse, res).pipe(res)
 * })
 * ```
 *
 * Pass the second, `res` parameter if you'd like to terminate the web Response if Node.js is terminated.
 */
export function getResponseReadable(response: Response, res?: ServerResponse) {
	const ac = new AbortController();

	// Abort controller if the response is aborted (ie the user cancelled streaming)
	res?.once("close", () => {
		ac.abort();
	});

	return Readable.fromWeb(response.body as any, { signal: ac.signal });
}

/** @unstable */
export interface ServeHTTPOptions {
	port: number;
	hostname?: string;
	grace?: number;
	// signal?: AbortSignal;
	// terminator?: Terminator;
}

/** @unstable */
export interface ServeHTTPHandler {
	(request: Request): MaybePromise<Response>;
}

/**
 * @unstable
 * @group HTTP
 *
 * A simple abstraction for creating a HTTP server, converting Node.js primatives into Fetch API objects and handling requests through a FetchRouter.
 *
 * ```js
 * const server = await serveHTTP({ port: 3000 }, async (request) => {
 * 	return new Response('Hello, There!')
 * })
 * ```
 *
 * This method returns a `node:http` Server after waiting for it to start listening.
 * The server has an extra `stop` method and also implements `[Symbol.asyncDispose]`.
 *
 * When stop is called, or it is dispoed with the `using` keyword, it will attempt to gracefully shutdown the HTTP server,
 * attempting to terminate each connection. If you created the server with a `grace` option,
 * it will wait for that maximum time before forcing every connection to close.
 * To quote the author of stoppable, this is "the way you probably expected it to work by default".
 *
 * ```js
 * async function main() {
 * 	await using server = await serveHTTP(
 * 		{ port: 3000, grace: 5000 },
 * 		() => new Response('ok')
 * 	)
 * }
 *
 * await main()
 * ```
 *
 * When main function exits, it will automatically close the server with a 5 second grace period.
 *
 * The stop method is also useful when used with a [Terminator](/core/#terminator).
 *
 */
export async function serveHTTP(
	options: ServeHTTPOptions,
	handler: ServeHTTPHandler,
): Promise<Server & Stoppable & AsyncDisposable> {
	const http = createServer(async (httpReq, httpRes) => {
		const request = getFetchRequest(httpReq);
		const response = await handler(request);
		applyResponse(response, httpRes);
	});

	const server = http.listen(
		{ port: options.port, hostname: options.hostname },
		() => {},
	);

	await new Promise<void>((r) => server.once("listening", () => r()));

	console.log(
		"Listening on http://%s:%s",
		options.hostname ?? "0.0.0.0",
		options.port ?? 3000,
	);

	const stop = createStoppable(server, { grace: options.grace });

	// options.terminator?._enqueue({
	// 	[Symbol.asyncDispose]: () => stop() as Promise<void>,
	// });

	// NOTE: AbortSignal? ~ it loses the async-ness
	// options.signal?.addEventListener("abort", () => stop());

	return Object.assign(server, { stop, [Symbol.asyncDispose]: stop });
}

export interface StopServerOptions {
	grace?: number;
}

export interface Stoppable {
	stop(): Promise<boolean>;
}

/**
 * @hidden
 *
 * A port of [stoppable.js](https://github.com/hunterloftis/stoppable/blob/master/lib/stoppable.js),
 * ported to Gruber to reduce external dependencies and simplify.
 *
 * ```js
 * import http from 'node:http'
 *
 * const server = http.createServer(…)
 * const stop = createStoppable(server, { grace: 10_000 })
 * ```
 */
export function createStoppable(
	server: Server,
	options: StopServerOptions = {},
): Stoppable["stop"] {
	const timeout = typeof options.grace === "number" ? options.grace : Infinity;
	const socketRequests = new Map<Socket, number>();

	let stopping = false;
	let gracefully = true;

	// Listen for sockets
	server.on("connection", (socket) => {
		socketRequests.set(socket, 0);
		socket.once("close", () => socketRequests.delete(socket));
	});

	// Count the requests per socket as they come in/out of the server
	// so we can later determine idle connections
	server.on("request", (req, res) => {
		if (!socketRequests.has(req.socket)) return;

		socketRequests.set(req.socket, socketRequests.get(req.socket)! + 1);

		res.once("finish", () => {
			if (!socketRequests.has(req.socket)) return;

			const pending = socketRequests.get(req.socket)! - 1;
			socketRequests.set(req.socket, pending);

			if (stopping && pending === 0) req.socket.end();
		});
	});

	// Dangerously end sockets and destroy connections
	async function nuke() {
		gracefully = false;
		for (const socket of socketRequests.keys()) socket.end();
		await new Promise((r) => setImmediate(r));
		for (const socket of socketRequests.keys()) socket.destroy();
	}

	return async () => {
		if (stopping) throw new Error("already stopping");

		// allow request handlers to update state before we act on that state
		await new Promise((r) => setImmediate(r));

		stopping = true;

		// Start the countdown to fully stop the server, if a timeout was set
		if (timeout < Infinity) setTimeout(() => nuke(), timeout);

		// Start closing the server
		const promise = new Promise<boolean>((resolve, reject) =>
			server.close((err) => (err ? reject(err) : resolve(gracefully))),
		);

		// Close any idle sockets
		for (const [socket, requests] of socketRequests.entries()) {
			if (requests === 0) socket.end();
		}

		return promise;
	};
}
