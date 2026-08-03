import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { defineRoute, FetchRouter, HTTPError, Cors } from "./mod.ts";

describe("FetchRouter", () => {
	describe("constructor", () => {
		it("stores routes", () => {
			const routes = [
				defineRoute({
					method: "GET",
					pathname: "/",
					handler: () => new Response("OK"),
				}),
			];
			const result = new FetchRouter({ routes });
			assert.deepEqual(result.routes, routes);
		});
		it("stores errorHandler", () => {
			const errorHandler = () => {};
			const result = new FetchRouter({ errorHandler });
			assert.deepEqual(result.errorHandler, errorHandler);
		});
		it("adds default logger", () => {
			const result = new FetchRouter({ log: true });
			assert.equal(result._middleware.length, 1);
		});
		it("adds custom loggers", () => {
			const log: any = () => {};
			const result = new FetchRouter({ log });
			assert.deepEqual(result._middleware, [log]);
		});
		it("adds cors", () => {
			const cors = new Cors();
			const result = new FetchRouter({ cors });
			assert.equal(result._middleware.length, 1);
		});
	});

	describe("findMatches", () => {
		const routes = [
			defineRoute({
				method: "GET",
				pathname: "/",
				handler: () => new Response("OK"),
			}),
			defineRoute({
				method: "POST",
				pathname: "/hello/:name",
				handler: () => new Response("OK"),
			}),
		];
		const router = new FetchRouter({ routes });

		it("returns matches", () => {
			const result = [
				...router.findMatches(new Request("http://testing.local/")),
			];

			assert.equal(result.length, 1, "should match 1 route");
		});
		it("parses the URL", () => {
			const result = [
				...router.findMatches(new Request("http://testing.local/")),
			];

			assert.equal(result.length, 1, "should match 1 route");
			assert(result[0].url instanceof URL, "should be a URL instance");
		});
		it("parses params", () => {
			const result = [
				...router.findMatches(
					new Request("http://testing.local/hello/Geoff", { method: "POST" }),
				),
			];

			assert.equal(result.length, 1, "should match 1 route");
			assert.deepEqual(
				result[0].result?.pathname?.groups,
				{ name: "Geoff" },
				"should be parse out URL parameters",
			);
		});
	});
	describe("processMatches", () => {
		const router = new FetchRouter();
		const matches = [
			{
				url: new URL("http://testing.local/"),
				result: {
					pathname: { groups: {} },
				},
				route: defineRoute({
					method: "GET",
					pathname: "/",
					handler: () => new Response("OK"),
				}),
			},
		];

		it("returns the response", async () => {
			const result = await router.processMatches(
				new Request("http://testing.local/"),
				matches as any,
			);

			assert(result instanceof Response, "should be a Response");
			assert.equal(result.status, 200);
			assert.equal(await result.text(), "OK");
		});
		it("throws http 404s", async () => {
			const result = await router
				.processMatches(new Request("http://testing.local/"), [])
				.catch((e) => e);

			assert(result instanceof HTTPError, "should be a HTTPError");
			assert.equal(result.status, 404);
		});
	});
	describe("processRoute", () => {
		it("uses the handler", async () => {
			const route = defineRoute({
				method: "GET",
				pathname: "/",
				handler: () => new Response("OK"),
			});
			const router = new FetchRouter();

			const result = await router.processRoute(route, {
				url: new URL("http://testing.local"),
				request: new Request("http://testing.local"),
				params: {},
			});

			assert.equal(await result?.text(), "OK");
		});
		it("sets params", async () => {
			const route = defineRoute({
				method: "GET",
				pathname: "/:name",
				handler: ({ params }) => new Response(params.name),
			});
			const router = new FetchRouter();

			const result = await router.processRoute(route, {
				url: new URL("http://testing.local"),
				request: new Request("http://testing.local"),
				params: { name: "geoff" },
			});

			assert.equal(await result?.text(), "geoff");
		});
		it("sets the url", async () => {
			const route = defineRoute({
				method: "GET",
				pathname: "/",
				handler: ({ url }) => new Response(url.toString()),
			});
			const router = new FetchRouter();

			const result = await router.processRoute(route, {
				url: new URL("http://testing.local"),
				request: new Request("http://testing.local"),
				params: {},
			});

			assert.equal(await result?.text(), "http://testing.local/");
		});
		it("injects dependencies", async () => {
			const route = defineRoute({
				method: "GET",
				pathname: "/",
				handler: ({ message }) => new Response(message),
				dependencies: {
					message: () => "hello there",
				},
			});
			const router = new FetchRouter();

			const result = await router.processRoute(route as any, {
				url: new URL("http://testing.local"),
				request: new Request("http://testing.local"),
				params: {},
			});

			assert.equal(await result?.text(), "hello there");
		});
	});
	describe("handleError", () => {
		const router = new FetchRouter();

		it("converts to HTTPError", () => {
			const result = router.handleError(
				new Request("http://localhost"),
				new Error(),
			);
			assert(result instanceof Response, "should be a Response");
			assert.equal(result.status, 500);
		});
		it("uses the HTTPError", () => {
			const result = router.handleError(
				new Request("http://localhost"),
				new HTTPError(400, "Bad Request"),
			);
			assert(result instanceof Response, "should be a Response");
			assert.equal(result.status, 400);
		});
		it("uses the callback", () => {
			let args: any[] = [];
			const router = new FetchRouter({
				errorHandler(...result) {
					args = result;
				},
			});
			router.handleError(
				new Request("http://localhost"),
				new HTTPError(500, "Internal Server Error"),
			);
			assert(args[0] instanceof HTTPError, "should be an HTTPError");
			assert.equal(args[0].status, 500);
			assert(args[1] instanceof Request, "should be a Request");
		});
	});

	describe("getResponse", () => {
		it("returns a response", async () => {
			const routes = [
				defineRoute({
					method: "PATCH",
					pathname: "/hello/:name",
					handler: ({ params }) => new Response(`Hello ${params.name}!`),
				}),
			];
			const router = new FetchRouter({ routes });

			const result = await router.getResponse(
				new Request("http://localhost/hello/Geoff", { method: "PATCH" }),
			);
			assert(result instanceof Response, "should be a Response");
			assert.equal(result.status, 200);
			assert.equal(await result.text(), "Hello Geoff!");
		});
		it("applies middleware", async () => {
			const routes = [
				defineRoute({
					method: "GET",
					pathname: "/",
					handler: () => new Response("OK"),
				}),
			];
			const router = new FetchRouter({ routes });

			let args: any = null;
			router._middleware = [
				(request, response) => {
					args = { request, response };
					return new Response("overridden");
				},
			];

			const result = await router.getResponse(
				new Request("http://localhost/", { method: "GET" }),
			);
			assert(result instanceof Response, "should be a Response");
			assert.equal(result.status, 200);
			assert.equal(
				await result.text(),
				"overridden",
				"should let middleware takeover the response",
			);

			assert(args?.request instanceof Request, "should pass the request");
			assert(args?.response instanceof Response, "should pass the response");
		});
		it("handles errors", async () => {
			const routes = [
				defineRoute({
					method: "GET",
					pathname: "/",
					handler: () => {
						throw new HTTPError(418, "I'm a teapot");
					},
				}),
			];
			const router = new FetchRouter({ routes });

			const result = await router.getResponse(
				new Request("http://localhost/", { method: "GET" }),
			);
			assert.equal(result.status, 418);
			assert.equal(result.statusText, "I'm a teapot");
		});
	});
});
