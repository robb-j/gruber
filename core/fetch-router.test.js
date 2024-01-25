import { FetchRouter } from "./fetch-router.js";
import { HTTPError, defineRoute } from "./http.js";
import { assertEquals, assertInstanceOf } from "./test-deps.js";

Deno.test("FetchRouter", async (t) => {
	await t.step("constructor", () => {
		const routes = [
			defineRoute({
				method: "GET",
				pathname: "/",
				handler: () => new Response("OK"),
			}),
		];
		const result = new FetchRouter({ routes });
		assertEquals(result.routes, routes, "should store the routes");
	});

	await t.step("findMatchingRoutes", async (t) => {
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

		await t.step("returns the match", () => {
			const result = [
				...router.findMatchingRoutes(new Request("http://localhost/")),
			];

			assertEquals(result.length, 1, "should match 1 route");
		});
		await t.step("parses the URL", () => {
			const result = [
				...router.findMatchingRoutes(new Request("http://localhost/")),
			];

			assertEquals(result.length, 1, "should match 1 route");
			assertInstanceOf(result[0].url, URL);
		});
		await t.step("parse params", () => {
			const result = [
				...router.findMatchingRoutes(
					new Request("http://localhost/hello/Geoff", { method: "POST" }),
				),
			];

			assertEquals(result.length, 1, "should match 1 route");
			assertEquals(
				result[0].result?.pathname?.groups,
				{ name: "Geoff" },
				"should be parse out URL parameters",
			);
		});
	});

	await t.step("processMatches", async (t) => {
		const router = new FetchRouter();
		const matches = [
			{
				url: new URL("http://localhost/"),
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

		await t.step("returns the response", async () => {
			const result = await router.processMatches(
				new Request("http://localhost/"),
				matches,
			);

			assertInstanceOf(result, Response);
			assertEquals(result.status, 200);
			assertEquals(await result.text(), "OK");
		});

		await t.step("throws http 404", async () => {
			const result = await router
				.processMatches(new Request("http://localhost/"), [])
				.catch((e) => e);

			assertInstanceOf(result, HTTPError);
			assertEquals(result.status, 404);
		});
	});

	await t.step("handleError", async (t) => {
		const router = new FetchRouter();

		await t.step("converts to HTTPError", () => {
			const result = router.handleError(
				new Request("http://localhost"),
				new Error(),
			);
			assertInstanceOf(result, Response);
			assertEquals(result.status, 500);
		});

		await t.step("uses the HTTPError", () => {
			const result = router.handleError(
				new Request("http://localhost"),
				new HTTPError(400, "Bad Request"),
			);
			assertInstanceOf(result, Response);
			assertEquals(result.status, 400);
		});

		await t.step("calls the callback", () => {
			let args = [];
			const router = new FetchRouter({
				errorHandler(...result) {
					args = result;
				},
			});
			router.handleError(
				new Request("http://localhost"),
				new HTTPError(500, "Internal Server Error"),
			);
			assertInstanceOf(args[0], Request);
			assertInstanceOf(args[1], HTTPError);
			assertEquals(args[1].status, 500);
		});
	});

	await t.step("getResponse", async () => {
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
		assertInstanceOf(result, Response);
		assertEquals(result.status, 200);
		assertEquals(await result.text(), "Hello Geoff!");
	});
});
