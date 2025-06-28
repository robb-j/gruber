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
	A HTTP router for pure Node.js

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
		res.appendHeader(key, value);
	}

	res.writeHead(response.status, response.statusText);

	if (response.body) getResponseReadable(response).pipe(res);
	else res.end();
}

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

/** @unstable A node version of Deno.serve now all the polyfills are in place */
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

// Adapted from https://github.com/hunterloftis/stoppable/blob/master/lib/stoppable.js
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
