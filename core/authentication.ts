import { HTTPError } from "../http/http-error.ts";
import type { RandomService } from "./random.ts";
import type { Store } from "./store.ts";
import type { TokenService } from "./tokens.ts";

/**
 * @hidden
 *
 * An in-progress authentication, being stored while the client completes their challenge
 */
export interface AuthnRequest {
	userId: number;
	// expiresAfter: number;
	redirect: string;
	code: number;
}

// IDEA: for tracking uses could check with a redis DECR
// export type CachedAuthnAttempts = [`/authn/attempts/${string}`, number]

/**
 * @hidden
 *
 * Intermediary parameters to present to the user to complete their authentication
 */
export interface AuthnCheck {
	token: string;
	code: number;
}

/**
 * @hidden
 *
 * Completed credentials after completing an authentication,
 * including cookie+redirected headers and the redirect itself
 */
export interface AuthnResult {
	token: string;
	headers: Headers;
	redirect: string;
}

/**
 * @internal
 */
export interface AbstractAuthenticationService {
	check(
		token: string | undefined | null,
		code: string | number | undefined | null,
	): Promise<AuthnRequest | null>;
	start(userId: number, redirectUrl: string | URL): Promise<AuthnCheck>;
	finish(request: AuthnRequest): Promise<AuthnResult>;
}

/**
 * @internal
 */
export function formatAuthenticationCode(code: number) {
	return [
		code.toString().padStart(6, "0").slice(0, 3),
		code.toString().padStart(6, "0").slice(3, 6),
	].join(" ");
}

/**
 * @internal
 */
export interface AuthenticationServiceOptions {
	allowedHosts: () => URL[] | Promise<URL[]>;
	cookieName: string;
	/** milliseconds */ loginDuration: number;
	/** milliseconds */ sessionDuration: number;
}

/** @internal */
export class AuthenticationService implements AbstractAuthenticationService {
	options: AuthenticationServiceOptions;
	store: Store;
	random: RandomService;
	tokens: TokenService;
	constructor(
		options: AuthenticationServiceOptions,
		store: Store,
		random: RandomService,
		tokens: TokenService,
	) {
		this.options = options;
		this.store = store;
		this.random = random;
		this.tokens = tokens;
	}

	//
	// Internal
	//

	_canRedirect(input: string | URL, hosts: URL[]) {
		const url = new URL(input);
		for (const allowed of hosts) {
			if (url.protocol !== allowed.protocol) continue;
			if (url.host !== allowed.host) continue;
			if (url.pathname.startsWith(allowed.pathname)) return true;
		}
		return false;
	}

	//
	// Public
	//

	async check(
		token: string | undefined | null,
		code: string | number | undefined | null,
	): Promise<AuthnRequest | null> {
		if (typeof code === "string") code = parseInt(code);
		if (
			typeof token !== "string" ||
			typeof code !== "number" ||
			Number.isNaN(code)
		) {
			return null;
		}

		const loginRequest = await this.store.get<AuthnRequest>(
			`/authn/request/${token}`,
		);

		if (!loginRequest || code !== loginRequest.code) return null;
		return loginRequest;
	}

	async start(userId: number, redirectUrl: string | URL): Promise<AuthnCheck> {
		const allowedHosts = await this.options.allowedHosts();
		if (!this._canRedirect(redirectUrl, allowedHosts)) {
			throw HTTPError.badRequest("invalid redirect_uri");
		}

		const token = this.random.uuid();
		const request: AuthnRequest = {
			userId,
			redirect: new URL(redirectUrl).toString(),
			code: this.random.number(0, 999_999),
		};

		await this.store.set<AuthnRequest>(`/authn/request/${token}`, request, {
			maxAge: this.options.loginDuration,
		});

		return { token, code: request.code };
	}

	async finish(request: AuthnRequest): Promise<AuthnResult> {
		const headers = new Headers();
		headers.set("Location", request.redirect);

		const token = await this.tokens.sign("user", {
			userId: request.userId,
			maxAge: this.options.sessionDuration,
		});

		const duration = Math.floor(this.options.sessionDuration / 1000);

		// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
		headers.append(
			"Set-Cookie",
			`${this.options.cookieName}=${token}; Max-Age=${duration}; Path=/; HttpOnly`,
		);

		// NOTE: Microsoft "safe links" opens URLs, generates auth then throws it away
		// Maybe it should be a counter? like 3 you get uses
		// await cache.delete(`/authn/request/${request.token}`)

		return { token, headers, redirect: request.redirect };
	}
}
