import { assertInstanceOf, assertEquals } from "./test-deps.js";
import { defineRoute, HTTPError } from "./http.js";

Deno.test("defineRoute", async (t) => {
	await t.step("sets the method", () => {
		const result = defineRoute({
			method: "GET",
			pathname: "/",
			handler() {},
		});
		assertEquals(result.method, "GET");
	});

	await t.step("creates a URLPattern", () => {
		const result = defineRoute({
			method: "GET",
			pathname: "/hello/:name",
			handler() {},
		});
		assertInstanceOf(result.pattern, URLPattern);
		assertEquals(result.pattern.pathname, "/hello/:name");
	});
});

Deno.test("HTTPError", async (t) => {
	await t.step("constructor", () => {
		const result = new HTTPError(418, "I'm a teapot");
		assertEquals(result.status, 418);
		assertEquals(result.statusText, "I'm a teapot");
		assertEquals(result.name, "HTTPError");
	});

	await t.step("toResponse", () => {
		const result = new HTTPError(200, "OK").toResponse();
		assertEquals(result.status, 200);
		assertEquals(result.statusText, "OK");
	});

	await t.step("badRequest", () => {
		const result = HTTPError.badRequest("body");
		assertEquals(result.status, 400);
		assertEquals(result.statusText, "Bad Request");
	});

	await t.step("unauthorized", () => {
		const result = HTTPError.unauthorized();
		assertEquals(result.status, 401);
		assertEquals(result.statusText, "Unauthorized");
	});

	await t.step("notFound", () => {
		const result = HTTPError.notFound();
		assertEquals(result.status, 404);
		assertEquals(result.statusText, "Not Found");
	});

	await t.step("internalServerError", () => {
		const result = HTTPError.internalServerError();
		assertEquals(result.status, 500);
		assertEquals(result.statusText, "Internal Server Error");
	});

	await t.step("notImplemented", () => {
		const result = HTTPError.notImplemented();
		assertEquals(result.status, 501);
		assertEquals(result.statusText, "Not Implemented");
	});
});
