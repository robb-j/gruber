import {
	assertEquals,
	describe,
	fakeJwt,
	fakeRandom,
	fakeTimers,
	it,
} from "./test-deps.js";
import {
	AuthenticationService,
	formatAuthenticationCode,
} from "./authentication.ts";
import { MemoryStore } from "./store.ts";

describe("formatAuthenticationCode", () => {
	it("pads and seperates", () => {
		assertEquals(formatAuthenticationCode(12345), "012 345");
	});
});

describe("AuthenticationService", () => {
	function setup() {
		const options = {
			allowedHosts: () => [new URL("https://example.com")],
			cookieName: "testing_session",
			loginDuration: 10_000,
			sessionDuration: 20_000,
		};
		const random = fakeRandom();
		const store = new MemoryStore(fakeTimers());
		const jwt = fakeJwt();
		const authn = new AuthenticationService(options, store, random, jwt);
		return { options, random, store, jwt, authn };
	}

	describe("_canRedirect", () => {
		it("allows hosts & paths", () => {
			const { authn } = setup();

			assertEquals(
				authn._canRedirect("https://example.com", [
					new URL("https://example.com"),
				]),
				true,
			);
			assertEquals(
				authn._canRedirect("https://example.com/api/", [
					new URL("https://example.com/api/"),
				]),
				true,
			);
			assertEquals(
				authn._canRedirect("https://example.com/api/endpoint", [
					new URL("https://example.com/api/"),
				]),
				true,
			);
		});

		it("blocks protocols", () => {
			const { authn } = setup();
			assertEquals(
				authn._canRedirect("http://example.com/", [
					new URL("https://example.com/"),
				]),
				false,
			);
		});

		it("blocks paths", () => {
			const { authn } = setup();
			assertEquals(
				authn._canRedirect("http://example.com/index.html", [
					new URL("https://example.com/api/"),
				]),
				false,
			);
		});
	});

	describe("check", () => {
		it("returns the matching request", async () => {
			const { authn, store } = setup();
			await store.set("/authn/request/abcdef", {
				userId: 1,
				redirect: "https://example.com",
				code: 123456,
			});

			assertEquals(await authn.check("abcdef", "123456"), {
				userId: 1,
				redirect: "https://example.com",
				code: 123456,
			});
		});
	});

	describe("start", () => {
		it("returns the check", async () => {
			const { authn } = setup();

			assertEquals(await authn.start(1, "https://example.com"), {
				token: "abcdef",
				code: 123456,
			});
		});
		it("stores the request", async () => {
			const { authn, store } = setup();
			await authn.start(1, "https://example.com");

			assertEquals(await store.get("/authn/request/abcdef"), {
				userId: 1,
				redirect: "https://example.com/",
				code: 123456,
			});
		});
	});

	describe("finish", () => {
		it("returns the result", async () => {
			const { authn } = setup();

			const result = await authn.finish({
				userId: 1,
				redirect: "https://example.com/",
				code: 123456,
			});

			const token = JSON.stringify({
				scope: "user",
				userId: 1,
				maxAge: 20_000,
			});

			assertEquals(result.token, token);
			assertEquals(result.headers.get("Location"), "https://example.com/");
			assertEquals(
				result.headers.get("Set-Cookie"),
				`testing_session=${token}; Max-Age=20; Path=/; HttpOnly`,
			);
			assertEquals(result.redirect, "https://example.com/");
		});
	});
});
