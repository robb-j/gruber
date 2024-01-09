import * as superstruct from "npm:superstruct@^1.0.3";

import {
	Configuration,
	type ConfigurationOptions,
	FetchRouter,
	RouteDefinition,
} from "../core/mod.js";
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

export class DenoConfiguration extends Configuration {
	static getOptions(): ConfigurationOptions {
		return {
			async readJsonFile(url: URL) {
				let file;
				try {
					file = await Deno.readTextFile(url);
				} catch (error) {
					if (error instanceof Deno.errors.NotFound) {
						return null;
					}
					throw error;
				}
				return JSON.parse(file);
			},
			getEnvironmentVariable(key) {
				return Deno.env.get(key);
			},
			superstruct,
		};
	}

	constructor() {
		super(DenoConfiguration.getOptions());
	}
}
