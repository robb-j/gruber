import { HTTPError } from "./http-error.ts";
import type { AuthzToken, TokenService } from "../core/mod.ts";

/**
 * Based on deno std
 * https://github.com/denoland/std/blob/065296ca5a05a47f9741df8f99c32fae4f960070/http/cookie.ts#L254C1-L270C2
 */
export function _getCookies(
	headers: Headers,
): Record<string, string | undefined> {
	const cookie = headers.get("Cookie");
	if (!cookie) return {};

	const result: Record<string, string | undefined> = {};
	for (const kv of cookie.split(";")) {
		const pivot = kv.indexOf("=");
		if (pivot === -1) {
			throw new SyntaxError("Invalid cookie");
		}
		result[kv.slice(0, pivot).trim()] = kv.slice(pivot + 1, Infinity);
	}
	return result;
}

export function _getRequestBearer(request: Request) {
	const authz = request.headers.get("authorization");
	if (!authz) return null;
	return /^bearer (.+)$/i.exec(authz)?.[1] ?? null;
}

export function _getRequestCookie(request: Request, cookieName: string) {
	try {
		return _getCookies(request.headers)[cookieName] ?? null;
	} catch {
		return null;
	}
}

/**
 * a:b:c -> [a, a:b, a:b:c]
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
 * @group Authorization
 *
 * Check whether a provided scope meets the requirement of the expected scope
 *
 * ```js
 * includesScope("user:books:read", "user:books:read"); // true
 * includesScope("user:books", "user:books:read"); // true
 * includesScope("user", "user:books:read"); // true
 * includesScope("user", "user:podcasts"); // true
 * includesScope("user:books", "user:podcasts"); // false
 * ```
 */
export function includesScope(actual: string, expected: string) {
	return _checkScope(actual, _expandScopes(expected));
}

/**
 * @group Authorization
 *
 * Options for asserting the authorization on any request
 *
 * ```js
 * const options = { scope: 'user:books' }
 * ```
 */
export interface AssertOptions {
	scope?: string;
}

/**
 * @group Authorization
 *
 * Options for asserting the authorization on a request that originated from a user
 *
 * ```js
 * const options = { scope: 'user:books' }
 * ```
 */
export interface AssertUserOptions {
	scope?: string;
}

/**
 * @group Authorization
 *
 * The result from asserting a request which was authorized for a user
 *
 * ```js
 * const result = { kind: 'user', userId: 42, scope: 'user' }
 * ```
 */
export interface AssertUserResult {
	kind: "user";

	// NOTE: should userId be a string for future-proofing / to align to JWTs?
	userId: number;
	scope: string;
}

/**
 * @group Authorization
 *
 * The result from asserting a request which was authorized for a service,
 * i.e. not a user
 *
 * ```js
 * const result = { kind: 'service', scope: 'user' }
 * ```
 */
export interface AssertServiceResult {
	kind: "service";
	scope: string;
}

/**
 * @group Authorization
 * The possible types of result from asserting a request's authorization
 */
export type AuthorizationResult = AssertUserResult | AssertServiceResult;

/**
 * @group Authorization
 * @unstable
 */
export interface AbstractAuthorizationService {
	getAuthorization(request: Request): string | null;
	assert(
		request: Request,
		options?: AssertOptions,
	): Promise<AuthorizationResult>;
	assertUser(
		request: Request,
		options?: AssertUserOptions,
	): Promise<AssertUserResult>;
	from(request: Request): Promise<AuthorizationResult | null>;
}

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
