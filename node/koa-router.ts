import { Context, Middleware } from "koa";

import { FetchRouter } from "../core/fetch-router.ts";
import {
	getFetchRequest,
	getResponseReadable,
	NodeRouterOptions,
} from "./node-router.ts";

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
	router: FetchRouter;
	constructor(options: NodeRouterOptions = {}) {
		this.router = new FetchRouter({
			routes: options.routes ?? [],
			errorHandler: (error, request) => this.onRouteError(error, request),
		});
	}

	middleware(): Middleware {
		return async (ctx, next) => {
			const request = getFetchRequest(ctx.req);
			const response = await this.getResponse(request);
			this.respond(ctx, response);
			await next();
		};
	}

	getResponse(request: Request): Promise<Response> {
		return this.router.getResponse(request);
	}

	onRouteError(error: unknown, request: Request): void {
		console.error("Fatal Route Error", error);
	}

	respond(ctx: Context, response: Response): void {
		ctx.response.status = response.status;
		ctx.response.message = response.statusText;

		for (const [key, value] of response.headers) {
			const values = value.split(",");
			ctx.response.set(key, values.length === 1 ? value : values);
		}

		if (response.body) {
			ctx.response.body = getResponseReadable(response);
		}
	}
}

/** @unstable */
export function koaMiddleware(router: FetchRouter): Middleware {
	const koa = new KoaRouter();
	koa.router = router;
	return koa.middleware();
}
