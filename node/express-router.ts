import {
	RequestHandler as ExpressRequestHandler,
	Response as ExporessResponse,
} from "express";

import { FetchRouter } from "../core/fetch-router.ts";
import {
	getFetchRequest,
	getResponseReadable,
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
		this.router = new FetchRouter({ routes: options.routes ?? [] });
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

	respond(res: ExporessResponse, response: Response): void {
		res.statusCode = response.status;
		res.statusMessage = response.statusText;

		for (const [key, value] of response.headers) {
			const values = value.split(",");
			res.set(key, values.length === 1 ? value : values);
		}

		if (response.body) getResponseReadable(response).pipe(res);
		else res.end();
	}
}
