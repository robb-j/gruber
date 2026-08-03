import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	_checkScope,
	_expandScopes,
	_getCookies,
	_getRequestBearer,
	_getRequestCookie,
	AuthorizationService,
} from "./authorization.ts";
import { fakeTokens } from "../testing/mod.ts";

describe("_getCookies", () => {
	it("parses a cookie", () => {
		const result = _getCookies(new Headers({ Cookie: "some=thing" }));
		assert.deepEqual(result, {
			some: "thing",
		});
	});
	it("parses cookies", () => {
		const result = _getCookies(
			new Headers({ Cookie: "some=thing; another=value" }),
		);
		assert.deepEqual(result, { some: "thing", another: "value" });
	});
	it("throws on incomplete", () => {
		assert.throws(
			() => _getCookies(new Headers({ Cookie: ";" })),
			new SyntaxError("Invalid cookie"),
		);
		assert.throws(
			() => _getCookies(new Headers({ Cookie: "; some=thing" })),
			new SyntaxError("Invalid cookie"),
		);
		assert.throws(
			() => _getCookies(new Headers({ Cookie: ";; some=thing" })),
			new SyntaxError("Invalid cookie"),
		);
		assert.throws(
			() => _getCookies(new Headers({ Cookie: "; some=thing ;" })),
			new SyntaxError("Invalid cookie"),
		);
	});
});

describe("_getRequestBearer", () => {
	it("returns the bearer token", () => {
		assert.equal(
			_getRequestBearer(
				new Request("https://example.com", {
					headers: { Authorization: "Bearer abcdef" },
				}),
			),
			"abcdef",
		);
	});
});

describe("_getRequestCookie", () => {
	it("returns value", () => {
		assert.equal(
			_getRequestCookie(
				new Request("https://example.com", {
					headers: { Cookie: "my_cookie=abcdef" },
				}),
				"my_cookie",
			),
			"abcdef",
		);
	});
	it("does not throw", () => {
		assert.equal(
			_getRequestCookie(
				new Request("https://example.com", {
					headers: { Cookie: "not_;a-cookie" },
				}),
				"my_cookie",
			),
			null,
		);
	});
});

describe("_expandScopes", () => {
	it("expands components", () => {
		assert.deepEqual(_expandScopes("user:libraries:read"), [
			"user",
			"user:libraries",
			"user:libraries:read",
		]);
	});
});

describe("_checkScope", () => {
	it("passes if included", () => {
		assert.equal(
			_checkScope("user:libraries", [
				"user",
				"user:libraries",
				"user:libraries:read",
			]),
			true,
		);
	});
	it("shortcuts admin", () => {
		assert.equal(
			_checkScope("admin", ["user", "user:libraries", "user:libraries:read"]),
			true,
		);
	});
	it("fails underscoped", () => {
		assert.equal(
			_checkScope("user:libraries:read", ["user", "user:libraries"]),
			false,
		);
	});
	it("fails misscoped", () => {
		assert.equal(
			_checkScope("user:libraries:read", ["user", "user:libraries:write"]),
			false,
		);
	});
});

describe("AuthorizationService", () => {
	function setup() {
		const options = { cookieName: "testing_session" };
		const tokens = fakeTokens();
		const authz = new AuthorizationService(options, tokens);
		return { options, tokens, authz };
	}

	describe("getAuthorization", () => {
		it("parses bearer", () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Authorization: "Bearer test_bearer_token" },
			});
			assert.equal(authz.getAuthorization(request), "test_bearer_token");
		});
		it("parses cookies", () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Cookie: "testing_session=test_cookie_value" },
			});
			assert.equal(authz.getAuthorization(request), "test_cookie_value");
		});
	});

	describe("from", () => {
		it("parses users", async () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Authorization: 'Bearer {"scope":"statuses","userId":1}' },
			});
			assert.deepEqual(await authz.from(request), {
				kind: "user",
				userId: 1,
				scope: "statuses",
			});
		});
		it("parses services", async () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Authorization: 'Bearer {"scope":"coffee-club"}' },
			});
			assert.deepEqual(await authz.from(request), {
				kind: "service",
				scope: "coffee-club",
			});
		});
	});

	describe("assert", () => {
		it("parses bearer", async () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Authorization: 'Bearer {"scope":"user","userId":1}' },
			});
			assert.deepEqual(await authz.assert(request), {
				kind: "user",
				scope: "user",
				userId: 1,
			});
		});
		it("parses cookies", async () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Cookie: 'testing_session={"scope":"user","userId":1}' },
			});
			assert.deepEqual(await authz.assert(request), {
				kind: "user",
				scope: "user",
				userId: 1,
			});
		});
		it("parses services", async () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Authorization: 'Bearer {"scope":"coffee-club"}' },
			});
			assert.deepEqual(await authz.assert(request), {
				kind: "service",
				scope: "coffee-club",
			});
		});
	});

	describe("assertUser", () => {
		it("returns user & scope from bearer", async () => {
			const { authz } = setup();
			const request = new Request("https://example.com", {
				headers: { Authorization: 'Bearer {"scope":"user","userId":1}' },
			});
			assert.deepEqual(await authz.assertUser(request, { scope: "user" }), {
				kind: "user",
				userId: 1,
				scope: "user",
			});
		});
		it("returns user & scope from cookies", async () => {
			const { authz } = setup();
			const request = new Request("https://example.com", {
				headers: { Cookie: 'testing_session={"scope":"user","userId":1}' },
			});
			assert.deepEqual(await authz.assertUser(request, { scope: "user" }), {
				kind: "user",
				userId: 1,
				scope: "user",
			});
		});
	});
});
