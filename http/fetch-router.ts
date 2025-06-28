import { Cors } from "./cors.ts";
import type {
	RouteContext,
	RouteDefinition,
	RouteResult,
} from "./define-route.ts";
import { HTTPError } from "./http-error.ts";

function _defaultLogger(request: Request, response: Response) {
	console.debug(response.status, request.method.padEnd(5), request.url);
	return response;
}

export interface _RouteMiddleware {
	(request: Request, response: Response): Promise<Response> | Response;
}

export interface _RouteMatch {
	route: RouteDefinition;
	url: URL;
	result: URLPatternResult;
}

export type RouteErrorHandler = (error: unknown, request: Request) => unknown;

export interface FetchRouterOptions {
	routes?: RouteDefinition<any, any>[];
	errorHandler?: RouteErrorHandler;

	/** @unstable */
	log?: boolean | _RouteMiddleware;

	/** @unstable */
	cors?: Cors;
}

export class FetchRouter {
	routes: RouteDefinition[];
	errorHandler?: RouteErrorHandler;
	_middleware: _RouteMiddleware[] = [];

	constructor(options: FetchRouterOptions = {}) {
		this.routes = options.routes ?? [];
		this.errorHandler = options.errorHandler ?? undefined;
		if (options.log === true) this._middleware.push(_defaultLogger);
		if (typeof options.log === "function") this._middleware.push(options.log);
		if (options.cors) {
			this._middleware.push((req, res) => options.cors!.apply(req, res));
		}
	}

	*findMatches(request: Request): Iterable<_RouteMatch> {
		const url = new URL(request.url);

		for (const route of this.routes) {
			if (request.method !== route.method) continue;

			const result = route.pattern.exec(url);
			if (!result) continue;

			yield { result, route, url };
		}
	}

	async processMatches(request: Request, matches: Iterable<_RouteMatch>) {
		for (const { route, result, url } of matches) {
			const response = await this.processRoute(route, {
				request,
				url,
				params: result.pathname.groups,
			});
			// NOTE: could emit request/response for logging?
			if (response instanceof Response) return response;
			if (response) throw new Error("Invalid Route Response");
		}

		throw HTTPError.notFound();
	}

	processRoute(
		route: RouteDefinition,
		base: RouteContext & { params: any },
	): RouteResult {
		return route.handler(route.dependencies.proxy(base));
	}

	handleError(request: Request, error: unknown): Response {
		// Get or create a HTTP error based on the one thrown
		const httpError =
			error instanceof HTTPError ? error : HTTPError.internalServerError();

		if (httpError.status >= 500) this.errorHandler?.(error, request);

		return httpError.toResponse();
	}

	async getResponse(request: Request) {
		try {
			let response = await this.processMatches(
				request,
				this.findMatches(request),
			);
			for (const fn of this._middleware) {
				response = await fn(request, response);
			}
			return response;
		} catch (error) {
			return this.handleError(request, error);
		}
	}
}
