import { Readable } from "node:stream";

import { FetchRouter } from "../core/fetch-router.js";
import { getFetchRequest, getResponseReadable } from "./node-router.js";

/** @typedef {import("koa").Context} Context */
/** @typedef {import("./node-router.js").NodeRouterOptions} NodeRouterOptions */

/** 
	A HTTP router for Koa applications

	```js
	const router = new KoaRouter(...)

	const app = new Koa()
		.use(koaHelmet())
		.use(...)
		.use(router.middleware());
		.use(...)
	```
*/
export class KoaRouter {
	/** @param {NodeRouterOptions} options */
	constructor(options = {}) {
		this.router = new FetchRouter({ routes: options.routes ?? [] });
	}

	/** @returns {import("koa").Middleware} */
	middleware() {
		return async (ctx, next) => {
			const request = getFetchRequest(ctx.req);
			const response = await this.getResponse(request);
			this.respond(ctx, response);
			await next();
		};
	}

	/** @param {Request} request */
	getResponse(request) {
		return this.router.getResponse(request);
	}

	/**
		@param {Context} ctx
		@param {Response} response
	*/
	respond(ctx, response) {
		ctx.response.status = response.status;
		ctx.response.statusMessage = response.statusText;

		for (const [key, value] of response.headers) {
			const values = value.split(",");
			ctx.response.set(key, values.length === 1 ? value : values);
		}

		if (response.body) {
			ctx.response.body = getResponseReadable(response);
		}
	}
}
