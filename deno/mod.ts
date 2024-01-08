import { FetchRouter, RouteDefinition } from "../core/mod.js";
export {
	defineRoute,
	HttpError,
	type RouteContext,
	type RouteHandler,
	type RouteOptions,
	type RouteDefinition,
} from "../core/mod.js";

export interface DenoRouterOptions {
	routes?: RouteDefinition[];
}

export class DenoRouter {
	router: FetchRouter;

	constructor(options: DenoRouterOptions) {
		this.router = new FetchRouter(options.routes ?? []);
	}

	getResponse(request: Request) {
		return this.router.getResponse(request);
	}

	forServe() {
		return (request: Request) => this.getResponse(request);
	}
}
