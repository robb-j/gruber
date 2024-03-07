import { Readable } from "node:stream";

import { FetchRouter } from "../core/fetch-router.js";
import { getFetchRequest } from "./node-router.js";

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
	/** @param {import("./node-router.js").NodeRouterOptions} options */
	constructor(options = {}) {
		this.router = new FetchRouter(options.routes ?? []);
	}

	/** @returns {import("express").RequestHandler} */
	middleware() {
		return async (req, res, next) => {
			const request = getFetchRequest(req);
			const response = await this.getResponse(request);
			this.respond(res, response);
			next();
		};
	}

	/** @param {Request} request */
	getResponse(request) {
		return this.router.getResponse(request);
	}

	/**
		@param {import("express").Response} res 
		@param {Response} response 
	 */
	respond(res, response) {
		res.statusCode = response.status;
		res.statusMessage = response.statusMessage;

		for (const [key, value] of response.headers) {
			const values = value.split(",");
			res.set(key, values.length === 1 ? value : values);
		}

		if (response.body) Readable.fromWeb(response.body).pipe(res);
		else res.end();
	}
}
