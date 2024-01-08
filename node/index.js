// Conditional ESM module loading (Node.js and browser)
if (!globalThis.URLPattern) await import("urlpattern-polyfill");

import Koa from "koa";
import koaHelmet from "koa-helmet";

import { Readable } from "node:stream";

import { FetchRouter } from "../core/mod.js";
export { defineRoute, HttpError } from "../core/mod.js";

/** @typedef {import('../core/mod.js').RouteDefinition} RouteDefinition */

/**
 * @typedef {object} NodeRouterOptions
 * @prop {RouteDefinition[]} routes
 */

/** A HTTP router for Node.js, powered by Koa */
export class HTTPRouter {
	router /** @type {FetchRouter} */;

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
			const request = getRequest(req);
			const response = await this.getResponse(request);
			nodeResponse(res, response);
		};
	}
}

/** A HTTP router for Node.js, powered by Koa */
export class KoaRouter {
	app /** @type {Koa} */;
	router /** @type {FetchRouter} */;

	/** @param {NodeRouterOptions} options */
	constructor(options = {}) {
		this.router = new FetchRouter(options.routes ?? []);
		this.app = new Koa()
			.use(koaHelmet())
			.use((ctx, next) => this.middleware(ctx));
	}

	/**
	 * @param {Koa.Context} ctx
	 * @param {Koa.Next} next
	 */
	async middleware(ctx, next) {
		const request = getRequest(ctx.req);
		const response = await this.getResponse(request);
		koaResponse(ctx, response);
	}

	/** @param {Request} request */
	getResponse(request) {
		return this.router.getResponse(request);
	}

	forHttpServer() {
		return this.app.callback();
	}
}

export { KoaRouter as NodeRouter };

/**
 * @param {import("node:http").ServerResponse} res
 * @param {Response} response
 */
async function nodeResponse(res, response) {
	res.statusCode = response.status;
	res.statusMessage = response.statusText;

	for (const [key, value] of response.headers) {
		const values = value.split(",");
		res.setHeader(key, values.length === 1 ? value : values);
	}

	if (response.body) Readable.fromWeb(response.body).pipe(res);
	else res.end();
}

/**
 * @param {Koa.Context} ctx
 * @param {Response} response
 */
async function koaResponse(ctx, response) {
	ctx.response.status = response.status;
	ctx.response.statusMessage = response.statusText;

	for (const [key, value] of response.headers) {
		const values = value.split(",");
		ctx.response.set(key, values.length === 1 ? value : values);
	}

	if (response.body) {
		ctx.response.body = Readable.fromWeb(response.body);
	}
}

/** @param {import("node:http").IncomingMessage} req */
function getRequest(req) {
	const url = "http://" + (req.headers.host ?? "localhost") + req.url;
	return new Request(url, {
		method: req.method,
		headers: getHeaders(req.headers),
		body: getIncomingBody(req),
	});
}

/** @param {import("node:http").IncomingHttpHeaders} input */
function getHeaders(input) {
	const result = new Headers();
	for (const [name, value] of Object.entries(input)) {
		if (Array.isArray(value)) for (const v of value) result.append(name, v);
		if (typeof value === "string") result.set(name, value);
	}
	return result;
}

/** @param {import("node:http").IncomingMessage} req */
function getIncomingBody(req) {
	if (req.method === "HEAD" || req.method === "GET") return undefined;
	return Readable.toWeb(req);
}

//
// ———
//

// Notes:
// - "res" folder
// - serve a "public"-type folder?
// - should it use koa-helmet
