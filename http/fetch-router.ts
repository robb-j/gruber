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

/**
 * `FetchRouter` is a web-native router for routes defined with `defineRoute`.
 *
 * ```js
 * const routes = [defineRoute("..."), defineRoute("..."), defineRoute("...")];
 *
 * const router = new FetchRouter({ routes });
 * ```
 *
 * All options to the `FetchRouter` constructor are optional
 * and you can create a router without any options if you want.
 *
 * `routes` are the route definitions you want the router to processes,
 * the router will handle a request based on the first route that matches.
 * So order is important.
 *
 * `errorHandler` is called if a non-`HTTPError` or a 5xx `HTTPError` is thrown.
 * It is called with the offending error and the request it is associated with.
 *
 * > NOTE: The `errorHandler` could do more in the future,
 * > like create it's own Response or mutate the existing response.
 * > This has not been designed and is left open to future development if it becomes important.
 *
 * `log` is an **unstable** option to turn on HTTP logging, it can be a boolean or middleware function.
 *
 * `cors` is an **unstable** option to apply a {@link CORS} instance to all requests
 *
 * @group Routing
 */
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

	/**
	 * Find each matching route in turn
	 *
	 * ```js
	 * let request = new Request('...')
	 *
	 * for (const match of router.findMatches(request)) {
	 * 	// do something with the request and/or break the loop
	 * }
	 * ```
	 */
	*findMatches(request: Request): Iterable<_RouteMatch> {
		const url = new URL(request.url);

		for (const route of this.routes) {
			if (request.method !== route.method) continue;

			const result = route.pattern.exec(url);
			if (!result) continue;

			yield { result, route, url };
		}
	}

	/**
	 * Take an iterator of route matches and convert them into a HTTP Response
	 * by executing the route's handler.
	 * It will return the first route to return a `Response` object
	 * or throw a `HTTPError` if no routes matched.
	 */
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

	/** Execute a route's handler to generate a HTTP `Response` */
	processRoute(
		route: RouteDefinition,
		base: RouteContext & { params: any },
	): RouteResult {
		return route.handler(route.dependencies.proxy(base));
	}

	/**
	 * Attempt to handle an error thrown from a route's handler,
	 * checking for well-known HTTPError instance or converting unknown errors into one.
	 * The HTTPError is then used to convert the error into a HTTP `Response`.
	 *
	 * If the error is server-based it will trigger the `FetchRouter`'s `errorHandler`.
	 */
	handleError(request: Request, error: unknown): Response {
		// Get or create a HTTP error based on the one thrown
		const httpError =
			error instanceof HTTPError ? error : HTTPError.internalServerError();

		// Notify the error handler for server-based errors
		if (httpError.status >= 500) this.errorHandler?.(error, request);

		// Use the error to generate a HTTP Response
		return httpError.toResponse();
	}

	/**
	 * @ignore
	 *
	 * Apply all configured middleware to a request/response pair in turn
	 */
	async _appleMiddleware(request: Request, response: Response) {
		for (const fn of this._middleware) {
			response = await fn(request, response);
		}
		return response;
	}

	/**
	 * Process all routes and get a HTTP Response.
	 *
	 * ```js
	 * const response = router.getResponse(
	 * 	new Request('http://localhost/pathname')
	 * )
	 * ```
	 *
	 * > NOTE: it would be nice to align this with the Fetch API `fetch` method signature.
	 */
	async getResponse(request: Request) {
		try {
			// Process routes to find a response
			let response = await this.processMatches(
				request,
				this.findMatches(request),
			);

			// Apply middleware to the response
			return await this._appleMiddleware(request, response);
		} catch (error) {
			try {
				// Handle the error and attempt to apply middleware to it
				return await this._appleMiddleware(
					request,
					this.handleError(request, error),
				);
			} catch (error) {
				// If the middleware failed too, just handle it
				return this.handleError(request, error);
			}
		}
	}
}
