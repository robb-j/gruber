import { HTTPError, RouteDefinition } from "./http.ts";

export type RouteErrorHandler = (error: unknown, request: Request) => unknown;

export interface MatchedRoute {
	route: RouteDefinition;
	url: URL;
	result: URLPatternResult;
}

export interface FetchRouterOptions {
	routes?: RouteDefinition[];
	errorHandler?: RouteErrorHandler;

	/** @unstable */
	log?: boolean | _RouteMiddleware;
}

/** @unstable */
export interface _RouteMiddleware {
	(request: Request, response: Response): void;
}

function _defaultLogger(request: Request, response: Response) {
	console.debug(response.status, request.method.padEnd(5), request.url);
}

/** A rudimentary HTTP router using fetch Request & Responses with RouteDefinitions based on URLPattern */
export class FetchRouter {
	routes: RouteDefinition[];
	errorHandler: RouteErrorHandler | undefined;
	_middleware: _RouteMiddleware[] = [];

	constructor(options: FetchRouterOptions = {}) {
		this.routes = options.routes ?? [];
		this.errorHandler = options.errorHandler ?? undefined;
		if (options.log === true) this._middleware.push(_defaultLogger);
		if (typeof options.log === "function") this._middleware.push(options.log);
	}

	/**
	 * Finds routes that match the request method and URLPattern
	 * and get's the matched parameters and parsed URL
	 */
	*findMatchingRoutes(request: Request): Iterable<MatchedRoute> {
		const url = new URL(request.url);

		for (const route of this.routes) {
			if (request.method !== route.method) continue;

			const result = route.pattern.exec(url);
			if (!result) continue;

			yield { result, route, url };
		}
	}

	/**
	 * Go through each route match and try to get a Response
	 */
	async processMatches(
		request: Request,
		matches: Iterable<MatchedRoute>,
	): Promise<Response> {
		for (const { route, result, url } of matches) {
			const response = await route.handler({
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

	handleError(request: Request, error: unknown): Response {
		// Get or create a HTTP error based on the one thrown
		const httpError =
			error instanceof HTTPError ? error : HTTPError.internalServerError();

		if (httpError.status >= 500) this.errorHandler?.(error, request);

		return httpError.toResponse();
	}

	async getResponse(request: Request) {
		try {
			const response = await this.processMatches(
				request,
				this.findMatchingRoutes(request),
			);
			this._middleware.forEach((fn) => fn(request, response));
			return response;
		} catch (error) {
			return this.handleError(request, error);
		}
	}
}
