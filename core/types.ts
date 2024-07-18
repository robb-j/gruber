/// <reference types="urlpattern-polyfill" />

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
	T extends `${string}:${infer Param}/${infer Rest}`
		? Param | ExtractRouteParams<Rest>
		: T extends `${string}:${infer Param}`
			? Param
			: never;

export interface RouteContext<T> {
	request: Request;
	params: T;
	url: URL;
}

export interface RouteHandler<T> {
	(context: RouteContext<T>): RouteResult;
}

export interface RouteOptions<T extends string> {
	method: HTTPMethod;
	pathname: T;
	handler: RouteHandler<Record<ExtractRouteParams<T>, string>>;
}

export interface RouteDefinition<T> {
	method: HTTPMethod;
	pattern: URLPattern;
	handler: RouteHandler<T>;
}
