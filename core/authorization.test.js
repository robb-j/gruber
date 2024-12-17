import {
	assertEquals,
	assertThrows,
	describe,
	fakeTokens,
	it,
} from "./test-deps.js";
import {
	_checkScope,
	_expandScopes,
	_getCookies,
	_getRequestBearer,
	_getRequestCookie,
	AuthorizationService,
} from "./authorization.ts";

describe("_getCookies", () => {
	it("parses a cookie", () => {
		const result = _getCookies(new Headers({ Cookie: "some=thing" }));
		assertEquals(result, {
			some: "thing",
		});
	});
	it("parses cookies", () => {
		const result = _getCookies(
			new Headers({ Cookie: "some=thing; another=value" }),
		);
		assertEquals(result, { some: "thing", another: "value" });
	});
	it("throws on incomplete", () => {
		assertThrows(
			() => _getCookies(new Headers({ Cookie: ";" })),
			new SyntaxError("Invalid cookie"),
		);
		assertThrows(
			() => _getCookies(new Headers({ Cookie: "; some=thing" })),
			new SyntaxError("Invalid cookie"),
		);
		assertThrows(
			() => _getCookies(new Headers({ Cookie: ";; some=thing" })),
			new SyntaxError("Invalid cookie"),
		);
		assertThrows(
			() => _getCookies(new Headers({ Cookie: "; some=thing ;" })),
			new SyntaxError("Invalid cookie"),
		);
	});
});

describe("_getRequestBearer", () => {
	it("returns the bearer token", () => {
		assertEquals(
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
		assertEquals(
			_getRequestCookie(
				new Request("https://example.com", {
					headers: { Cookie: "my_cookie=abcdef" },
				}),
				"my_cookie",
			),
			"abcdef",
		);
	});
});

describe("_expandScopes", () => {
	it("expands components", () => {
		assertEquals(_expandScopes("user:libraries:read"), [
			"user",
			"user:libraries",
			"user:libraries:read",
		]);
	});
});

describe("_checkScope", () => {
	it("passes if included", () => {
		assertEquals(
			_checkScope("user:libraries", [
				"user",
				"user:libraries",
				"user:libraries:read",
			]),
			true,
		);
	});
	it("shortcuts admin", () => {
		assertEquals(
			_checkScope("admin", ["user", "user:libraries", "user:libraries:read"]),
			true,
		);
	});
	it("fails underscoped", () => {
		assertEquals(
			_checkScope("user:libraries:read", ["user", "user:libraries"]),
			false,
		);
	});
	it("fails misscoped", () => {
		assertEquals(
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
			assertEquals(authz.getAuthorization(request), "test_bearer_token");
		});
		it("parses cookies", () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Cookie: "testing_session=test_cookie_value" },
			});
			assertEquals(authz.getAuthorization(request), "test_cookie_value");
		});
	});

	describe("assert", () => {
		it("parses bearer", async () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Authorization: 'Bearer {"scope":"user","userId":1}' },
			});
			assertEquals(await authz.assert(request), {
				scope: "user",
				userId: 1,
			});
		});
		it("parses cookies", async () => {
			const { authz } = setup();

			const request = new Request("https://example.com", {
				headers: { Cookie: 'testing_session={"scope":"user","userId":1}' },
			});
			assertEquals(await authz.assert(request), {
				scope: "user",
				userId: 1,
			});
		});
	});

	describe("assertUser", () => {
		it("returns user & scope from bearer", async () => {
			const { authz } = setup();
			const request = new Request("https://example.com", {
				headers: { Authorization: 'Bearer {"scope":"user","userId":1}' },
			});
			assertEquals(await authz.assertUser(request, { scope: "user" }), {
				userId: 1,
				scope: "user",
			});
		});
		it("returns user & scope from cookies", async () => {
			const { authz } = setup();
			const request = new Request("https://example.com", {
				headers: { Cookie: 'testing_session={"scope":"user","userId":1}' },
			});
			assertEquals(await authz.assertUser(request, { scope: "user" }), {
				userId: 1,
				scope: "user",
			});
		});
	});
});
