/** @typedef {import("./http.js").RouteDefinition} RouteDefinition */

/**
 * @typedef {object} MatchedRoute
 * @property {RouteDefinition} route
 * @property {URL} url
 * @property {URLPatternResult} result
 */

import { HTTPError } from "./http.js";

/** A rudimentary HTTP router using fetch Request & Responses with RouteDefinions based on URLPattern */
export class FetchRouter {
	routes /** @type {RouteDefinition} */;

	/** @param {RouteDefinition[]} routes */
	constructor(routes) {
		this.routes = routes;
	}

	/**
	 * Finds routes that match the request method and URLPattern
	 * and get's the matched parameters and parsed URL
	 * @param {Request} request
	 * @returns {MatchedRoute[]}
	 */
	findMatchingRoutes(request) {
		return this.routes
			.filter((route) => route.method === request.method)
			.map((route) => {
				const url = new URL(request.url);
				const result = route.pattern.exec(request.url);
				return { result, route, url };
			})
			.filter((item) => item.result);
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

	handleError(error) {
		// Get or create a HTTP error based on the one thrown
		const httpError =
			error instanceof HTTPError ? error : HTTPError.internalServerError();

		// NOTE: could emit the error
		// if (httpError.status >= 500) console.error("FetchRouter error:", error);

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
			return this.handleError(error);
		}
	}
}
