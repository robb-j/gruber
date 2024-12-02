import {
	RequestHandler as ExpressRequestHandler,
	Response as ExpressResponse,
} from "express";

import { FetchRouter } from "../core/fetch-router.ts";
import {
	applyResponse,
	getFetchRequest,
	NodeRouterOptions,
} from "./node-router.ts";

/**
	A HTTP router for Express applications

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
