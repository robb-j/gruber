import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { defineRoute } from "./define-route.ts";

describe("defineRoute", () => {
	it("sets the method", () => {
		const route = defineRoute({
			method: "GET",
			pathname: "/",
			handler: () => new Response("ok"),
		});
		assert.equal(route.method, "GET");
	});
	it("sets the pattern", () => {
		const route = defineRoute({
			method: "GET",
			pathname: "/some/:path",
			handler: () => new Response("ok"),
		});
		assert.deepEqual(
			route.pattern,
			new URLPattern({ pathname: "/some/:path" }),
		);

		const result = route.pattern.exec("http://testing.local/some/page");
		assert.equal(result?.pathname.groups.path, "page");
	});
	it("sets the handler", () => {
		const route = defineRoute({
			method: "GET",
			pathname: "/",
			handler: () => new Response("ok"),
		});
		assert.equal(typeof route.handler, "function");
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

		assert.equal(route.dependencies.get("message"), "hello there");
	});
});
