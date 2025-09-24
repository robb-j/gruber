import { HTTPError } from "./http-error.ts";
import type { AuthzToken, TokenService } from "../core/mod.ts";

/**
 * Based on deno std
 * https://github.com/denoland/std/blob/065296ca5a05a47f9741df8f99c32fae4f960070/http/cookie.ts#L254C1-L270C2
 *
 * NOTE: maybe this should be Map based?
 */
export function _getCookies(
	headers: Headers,
): Record<string, string | undefined> {
	const cookie = headers.get("Cookie");
	if (!cookie) return {};

	const result: Record<string, string | undefined> = {};

	// Split the cookie into individual definitions based on the ";" character
	for (const kv of cookie.split(";")) {
		// Find the equals character to determine the boundary between key and value
		const pivot = kv.indexOf("=");
		if (pivot === -1) throw new SyntaxError("Invalid cookie");

		// Slice out the key and value and assign it to the result
		result[kv.slice(0, pivot).trim()] = kv.slice(pivot + 1, Infinity);
	}
	return result;
}

/**
 * For a given HTTP Request, find the token value of a bearer-based Authorization header,
 * or null if it is not set
 */
export function _getRequestBearer(request: Request) {
	const authz = request.headers.get("authorization");
	if (!authz) return null;
	return /^bearer (.+)$/i.exec(authz)?.[1] ?? null;
}

/**
 * Get a specific cookie from the HTTP Request, or null if it is not set
 */
export function _getRequestCookie(request: Request, cookieName: string) {
	try {
		return _getCookies(request.headers)[cookieName] ?? null;
	} catch {
		return null;
	}
}

/**
 * `a:b:c` -> [`a`, `a:b`, `a:b:c`]
 *
 * Take a scope and expand it into all possible parent scopes that have the same permission.
 *
 * For example `a:b:c` expands to:
 * - `a:b:c`
 * - `a:b`
 * - `a`
 *
 * Then if any of those scopes are present, the request is authorized.
 */
export function _expandScopes(scope: string) {
	const prefix = [];
	const output = [];
	for (const item of scope.split(":")) {
		output.push([...prefix, item].join(":"));
		prefix.push(item);
	}
	return output;
}

export function _checkScope(actual: string, expected: string[]) {
	for (const provided of actual.split(/\s+/)) {
		if (provided === "admin") return true;
		if (expected.includes(provided)) return true;
	}
	return false;
}

/**
 * // @group Authorization
 *
 * Check whether a provided scope meets the requirement of the expected scope
 *
 * The idea is that a parent scope contains all children scopes, recursively.
 * So if you find all the parents of a given scope, you can test it against a scope that has been provided by a user.
 *
 * For example `user:books:read` expands to:
 * - `user:books:read`
 * - `user:books`
 * - `user`
 *
 * So if any of those scopes are authorized, access can be granted.
 *
 * ```js
 * includesScope("user:books:read", "user:books:read"); // true
 * includesScope("user:books", "user:books:read");      // true
 * includesScope("user", "user:books:read");            // true
 * includesScope("user", "user:podcasts");              // true
 * includesScope("user:books", "user:podcasts");        // false
 * ```
 */
export function includesScope(actual: string, expected: string) {
	return _checkScope(actual, _expandScopes(expected));
}

/**
 * @ignore
 * Options for asserting the authorization on any request
 */
export interface AssertOptions {
	scope?: string;
}

/**
 * @ignore
 *
 * Options for asserting the authorization on a request that originated from a user
 */
export interface AssertUserOptions {
	scope?: string;
}

/**
 * @ignore
 *
 * The result from asserting a request which was authorized for a user
 */
export interface AssertUserResult {
	kind: "user";

	// NOTE: should userId be a string for future-proofing / to align to JWTs?
	userId: number;
	scope: string;
}

/**
 * @ignore
 *
 * The result from asserting a request which was authorized for a service,
 * i.e. not a user
 */
export interface AssertServiceResult {
	kind: "service";
	scope: string;
}

/**
 * @ignore
 * The possible types of result from asserting a request's authorization
 */
export type AuthorizationResult = AssertUserResult | AssertServiceResult;

/**
 * @group Authorization
 * @unstable
 */
export interface AbstractAuthorizationService {
	/**
	 * ...
	 */
	getAuthorization(request: Request): string | null;

	/**
	 * ...
	 */
	assert(
		request: Request,
		options?: AssertOptions,
	): Promise<AuthorizationResult>;

	/**
	 * ...
	 */
	assertUser(
		request: Request,
		options?: AssertUserOptions,
	): Promise<AssertUserResult>;

	/**
	 * ...
	 */
	from(request: Request): Promise<AuthorizationResult | null>;
}

/**
 * @ignore
 * Options for creating an AuthorizationService
 */
export interface AuthorizationServiceOptions {
	cookieName: string;
}

/**
 * @unstable
 * @group Authorization
 */
export class AuthorizationService implements AbstractAuthorizationService {
	options: AuthorizationServiceOptions;
	tokens: TokenService;
	constructor(options: AuthorizationServiceOptions, tokens: TokenService) {
		this.options = options;
		this.tokens = tokens;
	}

	getAuthorization(request: Request) {
		return (
			_getRequestBearer(request) ??
			_getRequestCookie(request, this.options.cookieName)
		);
	}

	_processToken(verified: AuthzToken): AuthorizationResult {
		return typeof verified.userId === "number"
			? { kind: "user", userId: verified.userId, scope: verified.scope }
			: { kind: "service", scope: verified.scope };
	}

	async from(request: Request): Promise<AuthorizationResult | null> {
		const authz = this.getAuthorization(request);
		if (!authz) return null;

		const verified = await this.tokens.verify(authz);
		return verified ? this._processToken(verified) : null;
	}

	async assert(
		request: Request,
		options: AssertOptions = {},
	): Promise<AuthorizationResult> {
		const authz = this.getAuthorization(request);

		if (!authz) throw HTTPError.unauthorized("no authorization present");

		const verified = await this.tokens.verify(authz);
		if (!verified) throw HTTPError.unauthorized("no valid authorization");

		if (options.scope && !includesScope(verified.scope, options.scope)) {
			throw HTTPError.unauthorized("missing required scope: " + options.scope);
		}

		return this._processToken(verified);
	}

	async assertUser(
		request: Request,
		options: AssertUserOptions = {},
	): Promise<AssertUserResult> {
		const verified = await this.assert(request, {
			scope: options.scope,
		});

		if (verified.kind !== "user") throw HTTPError.unauthorized("not a user");

		return verified;
	}
}
