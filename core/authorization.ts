import { HTTPError } from "./http.ts";
import { AuthzToken, TokenService } from "./tokens.ts";

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
	return _getCookies(request.headers)[cookieName] ?? null;
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

export function includesScope(actual: string, expected: string) {
	return _checkScope(actual, _expandScopes(expected));
}

export interface AssertUserOptions {
	scope?: string;
}

// NOTE: should userId be a string for future-proofing / to align to JWTs?
export interface AssertUserResult {
	userId: number;
	scope: string;
}

export interface AbstractAuthorizationService {
	getAuthorization(request: Request): Promise<AuthzToken>;
	assertUser(
		request: Request,
		options?: AssertUserOptions,
	): Promise<AssertUserResult>;
}

export interface AuthorizationServiceOptions {
	cookieName: string;
}

/** @unstable */
export class AuthorizationService implements AbstractAuthorizationService {
	constructor(
		public options: AuthorizationServiceOptions,
		public tokens: TokenService,
	) {}

	async getAuthorization(request: Request) {
		const authz =
			_getRequestBearer(request) ??
			_getRequestCookie(request, this.options.cookieName);

		if (!authz) throw HTTPError.unauthorized("no authorization present");

		const verified = await this.tokens.verify(authz);
		if (!verified) throw HTTPError.unauthorized("no valid authorization");
		return verified;
	}

	async assertUser(
		request: Request,
		options: AssertUserOptions = {},
	): Promise<AssertUserResult> {
		const verified = await this.getAuthorization(request);

		const { userId, scope } = verified;
		if (userId === undefined) throw HTTPError.unauthorized("not a user");

		if (options.scope && !includesScope(scope, options.scope)) {
			throw HTTPError.unauthorized("missing required scope: " + options.scope);
		}

		return { userId, scope };
	}
}
