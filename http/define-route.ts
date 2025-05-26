import {
	Container,
	Dependencies,
	UnwrapDependencies,
} from "../core/container.ts";

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

export type ExtractRouteParams<T extends string> =
	T extends `${string}*${string}`
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

export type RouteParams<T extends string> = {
	params: Record<ExtractRouteParams<T>, string>;
};

export interface RouteContext {
	request: Request;
	url: URL;
}

export interface RouteHandler<T> {
	(context: RouteContext & T): RouteResult;
}

export interface RouteOptions<T extends string, U extends Dependencies> {
	method: HTTPMethod;
	pathname: T;
	handler: RouteHandler<RouteParams<T> & UnwrapDependencies<U>>;
	dependencies?: U;
}

export interface RouteDefinition<T = {}, U extends Dependencies = {}> {
	method: HTTPMethod;
	pattern: URLPattern;
	handler: RouteHandler<T>;
	dependencies: Container<U>;
}

export function defineRoute<T extends string, U extends Dependencies = {}>(
	options: RouteOptions<T, U>,
): RouteDefinition<RouteParams<T> & UnwrapDependencies<U>, U> {
	return {
		method: options.method,
		pattern: new URLPattern({ pathname: options.pathname }),
		handler: options.handler,
		dependencies: new Container<any>(options.dependencies ?? {}),
	};
}
