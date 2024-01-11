import { parseArgs, superstruct } from "./deps.ts";

import {
	Configuration,
	FetchRouter,
	RouteDefinition,
	type ConfigurationOptions,
} from "../core/mod.js";
export {
	HTTPError,
	defineRoute,
	type RouteContext,
	type RouteDefinition,
	type RouteHandler,
	type RouteOptions,
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
		const args = parseArgs(Deno.args);
		return {
			superstruct,
			async readTextFile(url: URL) {
				try {
					return await Deno.readTextFile(url);
				} catch (error) {
					if (error instanceof Deno.errors.NotFound) return null;
					else throw error;
				}
			},
			getEnvironmentVariable(key) {
				return Deno.env.get(key);
			},
			getCommandArgument(key) {
				return args[key];
			},
			stringify(config) {
				return JSON.stringify(config, null, 2);
			},
			parse(data) {
				return JSON.parse(data);
			},
		};
	}

	constructor() {
		super(DenoConfiguration.getOptions());
	}
}
