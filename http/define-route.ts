import {
	Container,
	type Dependencies,
	type UnwrapDependencies,
} from "../core/container.ts";

/**
 * @ignore
 *
 * HTTP methods supported by {@link defineRoute}
 */
export type HTTPMethod =
	| "GET"
	| "HEAD"
	| "POST"
	| "PUT"
	| "PATCH"
	| "DELETE"
	| "CONNECT"
	| "OPTIONS";

export type RouteResult = Promise<Response | undefined> | Response | undefined;

/**
 * @ignore
 *
 * A utility type to convert a pathname parameters from string into a record to type `params`
 */
export type ExtractRouteParams<T extends string> =
	T extends `${string}*${string}`
		? string
		: T extends `${string}?${string}`
			? string
			: T extends `${string}:${infer Param}/${infer Rest}`
				? Param | ExtractRouteParams<Rest>
				: T extends `${string}:${infer Param}`
					? Param
					: never;

// type A = ExtractRouteParams<"/">;
// type B = ExtractRouteParams<"/:name">;
// type C = ExtractRouteParams<"/path/:name">;
// type D = ExtractRouteParams<"/path/:name/another/:thing">;
// type E = ExtractRouteParams<"*">;
// type F = ExtractRouteParams<"*">;

export type RouteParams<T extends string> = {
	params: Record<ExtractRouteParams<T>, string>;
};

export interface RouteContext {
	request: Request;
	url: URL;
}

export interface RouteHandler<T extends string, U> {
	(context: RouteContext & RouteParams<T> & U): RouteResult;
}

export interface RouteOptions<T extends string, U extends Dependencies> {
	method: HTTPMethod | "*";
	pathname: T;
	handler: RouteHandler<T, UnwrapDependencies<U>>;
	dependencies?: U;
}

export interface RouteDefinition<
	T extends string = string,
	U extends Dependencies = {},
> {
	method: HTTPMethod | "*";
	pattern: URLPattern;
	handler: RouteHandler<T, UnwrapDependencies<U>>;
	dependencies: Container<U>;
}

/**
 * `defineRoute` is the way of specifying how your server handles a specific bit of web traffic.
 * It returns the RouteDefinition which can be passed around and used in various places.
 * Mainly it is passed to a `FetchRouter` to serve web requests.
 *
 * ```js
 * export const helloRoute = defineRoute({
 * 	method: "GET",
 * 	pathname: "/hello/:name",
 * 	handler({ request, url, params }) {
 * 		return new Response(`Hello, ${params.name}!`);
 * 	}
 * })
 * ```
 *
 * @group Routing
 */
export function defineRoute<T extends string, U extends Dependencies = {}>(
	options: RouteOptions<T, U>,
): RouteDefinition<T, U> {
	return {
		method: options.method,
		pattern: new URLPattern({ pathname: options.pathname }),
		handler: options.handler,
		dependencies: new Container<any>(options.dependencies ?? {}),
	};
}
