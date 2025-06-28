import type { TokenService } from "../core/mod.ts";
import { AuthorizationService } from "../http/mod.ts";

export function fakeToken(scope: string, userId?: number) {
	return JSON.stringify({ scope, userId });
}

export function fakeTokens(): TokenService {
	return {
		async verify(token) {
			return JSON.parse(token);
		},
		async sign(scope, options) {
			return fakeToken(scope, options?.userId);
		},
	};
}

export function fakeAuthz() {
	return new AuthorizationService(
		{ cookieName: "testingCookie" },
		fakeTokens(),
	);
}
