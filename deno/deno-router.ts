import { FetchRouter } from "../core/fetch-router.ts";
import { RouteDefinition } from "../core/http.ts";

export interface DenoRouterOptions {
	routes?: RouteDefinition[];
}

export class DenoRouter {
	router: FetchRouter;

	constructor(options: DenoRouterOptions) {
		this.router = new FetchRouter({
			routes: options.routes,
			errorHandler: (error, request) => this.onRouteError(error, request),
		});
	}

	getResponse(request: Request) {
		return this.router.getResponse(request);
	}

	forDenoServe() {
		return (request: Request) => this.getResponse(request);
	}

	onRouteError(error: unknown, _request: Request) {
		console.error("Fatal Route Error", error);
	}
}
