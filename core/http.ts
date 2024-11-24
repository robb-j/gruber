import { StructError, Structure } from "./structures.ts";

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

export type RouteParams<T extends string> = Record<
	ExtractRouteParams<T>,
	string
>;

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
	handler: RouteHandler<RouteParams<T>>;
}

export interface RouteDefinition<T = any> {
	method: HTTPMethod;
	pattern: URLPattern;
	handler: RouteHandler<T>;
}

export function defineRoute<T extends string>(
	options: RouteOptions<T>,
): RouteDefinition<RouteParams<T>> {
	return {
		method: options.method,
		pattern: new URLPattern({ pathname: options.pathname }),
		handler: options.handler,
	};
}

// NOTE: add more error codes as needed
export class HTTPError extends Error {
	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400
	 */
	static badRequest(body: BodyInit | undefined = undefined) {
		return new HTTPError(400, "Bad Request", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
	 */
	static unauthorized(body: BodyInit | undefined = undefined) {
		return new HTTPError(401, "Unauthorized", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404
	 */
	static notFound(body: BodyInit | undefined = undefined) {
		return new HTTPError(404, "Not Found", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500
	 */
	static internalServerError(body: BodyInit | undefined = undefined) {
		return new HTTPError(500, "Internal Server Error", body);
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/501
	 */
	static notImplemented(body: BodyInit | undefined = undefined) {
		return new HTTPError(501, "Not Implemented", body);
	}

	status: number;
	statusText: string;
	body: BodyInit | undefined;
	headers: Headers | undefined;

	constructor(
		status: number = 200,
		statusText: string = "OK",
		body: BodyInit | undefined = undefined,
		headers: HeadersInit | undefined = undefined,
	) {
		super(statusText);
		this.status = status;
		this.statusText = statusText;
		this.body = body;
		this.name = "HTTPError";
		this.headers = new Headers(headers);
		Error.captureStackTrace(this, HTTPError);
	}

	toResponse() {
		return new Response(this.body, {
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
		});
	}
}

/** @unstable */
export function getRequestBody(request: Request) {
	const ct = request.headers.get("Content-Type");
	if (ct === "application/x-www-form-urlencoded") return request.formData();
	return request.json();
}

/** @unstable */
export function assertRequestBody<T>(struct: Structure<T>, input: unknown): T {
	if (input instanceof FormData) input = Object.fromEntries(input.entries());
	try {
		return struct.process(input);
	} catch (error) {
		if (error instanceof StructError) {
			throw HTTPError.badRequest(error.toFriendlyString());
		}
		throw Error;
	}
}
