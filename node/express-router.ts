import type {
	RequestHandler as ExpressRequestHandler,
	Response as ExpressResponse,
} from "express";

import { FetchRouter } from "../http/fetch-router.ts";
import {
	applyResponse,
	getFetchRequest,
	type NodeRouterOptions,
} from "./node-router.ts";

/**
	@deprecated use {@link expressMiddleware}

	```js
	const router = new ExpressRouter(...)

	const app = express()
		.use(...)
		.use(router.middleware());
		.use(...)
	```
*/
export class ExpressRouter {
	router: FetchRouter;
	constructor(options: NodeRouterOptions = {}) {
		this.router = new FetchRouter({
			routes: options.routes ?? [],
			errorHandler: (error, request) => this.onRouteError(error, request),
		});
	}

	middleware(): ExpressRequestHandler {
		return async (req, res, next) => {
			const request = getFetchRequest(req);
			const response = await this.getResponse(request);
			this.respond(res, response);
			next();
		};
	}

	getResponse(request: Request): Promise<Response> {
		return this.router.getResponse(request);
	}

	onRouteError(error: unknown, request: Request): void {
		console.error("Fatal Route Error", error);
	}

	respond(res: ExpressResponse, response: Response): void {
		applyResponse(response, res);
	}
}

/**
 * Create an middleware to use a `FetchRouter` in a Express app
 *
 * ```js
 * const router = new FetchRouter(…)
 *
 * const app = express()
 *   .use(...)
 *   .use(expressMiddleware(router));
 *   .use(...)
 * ```
 */
export function expressMiddleware(router: FetchRouter): ExpressRequestHandler {
	const express = new ExpressRouter();
	express.router = router;
	return express.middleware();
}
