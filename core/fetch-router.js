import { HTTPError } from "./http.js";

/** @typedef {import("./types.ts").RouteDefinition<any>} RouteDefinition */

/** @typedef {(error: unknown, request: Request) => unknown} RouteErrorHandler */

/**
 * @typedef {object} MatchedRoute
 * @property {RouteDefinition} route
 * @property {URL} url
 * @property {URLPatternResult} result
 */

/**
 * @typedef {object} FetchRouterOptions
 * @property {RouteDefinition[]} [routes]
 * @property {RouteErrorHandler} [errorHandler]
 */

/** A rudimentary HTTP router using fetch Request & Responses with RouteDefinitions based on URLPattern */
export class FetchRouter {
	/** @type {RouteDefinition} */ routes;
	/** @type {RouteErrorHandler | null} */ errorHandler;

	/** @param {FetchRouterOptions} [options] */
	constructor(options = {}) {
		this.routes = options.routes ?? [];
		this.errorHandler = options.errorHandler ?? null;
	}

	/**
	 * Finds routes that match the request method and URLPattern
	 * and get's the matched parameters and parsed URL
	 * @param {Request} request
	 * @returns {Iterator<MatchedRoute>}
	 */
	*findMatchingRoutes(request) {
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
	 * @param {Request} request
	 * @param {Iterator<MatchedRoute>} matches
	 */
	async processMatches(request, matches) {
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

	/**
	 * @param {Request} request
	 * @param {unknown} error
	 */
	handleError(request, error) {
		// Get or create a HTTP error based on the one thrown
		const httpError =
			error instanceof HTTPError ? error : HTTPError.internalServerError();

		if (httpError.status >= 500) this.errorHandler?.(error, request);

		return httpError.toResponse();
	}

	/** @param {Request} request */
	async getResponse(request) {
		try {
			return await this.processMatches(
				request,
				this.findMatchingRoutes(request),
			);
		} catch (error) {
			return this.handleError(request, error);
		}
	}
}
