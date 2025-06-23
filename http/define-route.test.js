import { describe, it, assertEquals } from "../core/test-deps.js";
import { defineRoute } from "./define-route.ts";

describe("defineRoute", () => {
	it("sets the method", () => {
		const route = defineRoute({
			method: "GET",
			pathname: "/",
			handler: () => new Response("ok"),
		});
		assertEquals(route.method, "GET");
	});
	it("sets the pattern", () => {
		const route = defineRoute({
			method: "GET",
			pathname: "/some/:path",
			handler: () => new Response("ok"),
		});
		assertEquals(route.pattern, new URLPattern({ pathname: "/some/:path" }));

		const result = route.pattern.exec("http://testing.local/some/page");
		assertEquals(result?.pathname.groups.path, "page");
	});
	it("sets the handler", () => {
		const route = defineRoute({
			method: "GET",
			pathname: "/",
			handler: () => new Response("ok"),
		});
		assertEquals(typeof route.handler, "function");
	});
	it("creates dependencies", () => {
		const route = defineRoute({
			method: "GET",
			pathname: "/",
			handler: () => new Response("ok"),
			dependencies: {
				message: () => "hello there",
			},
		});

		assertEquals(route.dependencies.get("message"), "hello there");
	});
});
