import { FetchRouter } from "../core/fetch-router.js";
import { RouteDefinition } from "../core/http.js";

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
