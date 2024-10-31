import { assertInstanceOf, assertEquals, describe, it } from "./test-deps.js";
import { defineRoute, HTTPError } from "./http.ts";

describe("defineRoute", () => {
	it("sets the method", () => {
		const result = defineRoute({
			method: "GET",
			pathname: "/",
			handler() {},
		});
		assertEquals(result.method, "GET");
	});

	it("creates a URLPattern", () => {
		const result = defineRoute({
			method: "GET",
			pathname: "/hello/:name",
			handler() {},
		});
		assertInstanceOf(result.pattern, URLPattern);
		assertEquals(result.pattern.pathname, "/hello/:name");
	});
});

describe("HTTPError", () => {
	describe("constructor", () => {
		it("creates the error", () => {
			const result = new HTTPError(418, "I'm a teapot");
			assertEquals(result.status, 418);
			assertEquals(result.statusText, "I'm a teapot");
			assertEquals(result.name, "HTTPError");
		});
	});

	describe("toResponse", () => {
		it("creates the error", () => {
			const result = new HTTPError(200, "OK").toResponse();
			assertEquals(result.status, 200);
			assertEquals(result.statusText, "OK");
		});
		it("sets headers", () => {
			const error = new HTTPError(200, "OK", null, {
				"X-HOTEL-BAR": "Hotel Bar?",
			});

			const result = error.toResponse();
			assertEquals(result.headers.get("X-HOTEL-BAR"), "Hotel Bar?");
		});
	});

	describe("badRequest", () => {
		it("creates the error", () => {
			const result = HTTPError.badRequest("body");
			assertEquals(result.status, 400);
			assertEquals(result.statusText, "Bad Request");
		});
	});

	describe("unauthorized", () => {
		it("creates the error", () => {
			const result = HTTPError.unauthorized();
			assertEquals(result.status, 401);
			assertEquals(result.statusText, "Unauthorized");
		});
	});

	describe("notFound", () => {
		it("creates the error", () => {
			const result = HTTPError.notFound();
			assertEquals(result.status, 404);
			assertEquals(result.statusText, "Not Found");
		});
	});

	describe("internalServerError", () => {
		it("creates the error", () => {
			const result = HTTPError.internalServerError();
			assertEquals(result.status, 500);
			assertEquals(result.statusText, "Internal Server Error");
		});

		describe("notImplemented", () => {
			it("creates the error", () => {
				const result = HTTPError.notImplemented();
				assertEquals(result.status, 501);
				assertEquals(result.statusText, "Not Implemented");
			});
		});
	});
});
