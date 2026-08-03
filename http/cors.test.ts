import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Cors } from "./cors.ts";

describe("Cors", () => {
	describe("constructor", () => {
		it("stores credentials", () => {
			const cors = new Cors({ credentials: true });
			assert.equal(cors.credentials, true);
		});
		it("stores origins", () => {
			const cors = new Cors({
				origins: ["https://duck.com", "https://example.com"],
			});
			assert.deepEqual(
				cors.origins,
				new Set(["https://duck.com", "https://example.com"]),
			);
		});
	});

	describe("apply", () => {
		it("adds methods header", () => {
			const request = new Request("http://testing.local");
			const cors = new Cors();
			const response = cors.apply(request, new Response());

			assert.equal(
				response.headers.get("Access-Control-Allow-Methods"),
				"GET, HEAD, PUT, PATCH, POST, DELETE",
			);
		});
		it("adds request headers", () => {
			const request = new Request("http://testing.local", {
				headers: [
					["Access-Control-Request-Headers", "content-type"],
					["Access-Control-Request-Headers", "x-pingother"],
				],
			});
			const cors = new Cors();
			const response = cors.apply(request, new Response());

			assert.equal(
				response.headers.get("Access-Control-Allow-Headers"),
				"content-type, x-pingother",
				"should add the headers to Access-Control-Allow-Headers",
			);
			assert.match(
				response.headers.get("Vary")!,
				/Access-Control-Request-Headers/,
				"should modify the Vary header",
			);
		});
		it("adds wildcard origins", () => {
			const request = new Request("http://testing.local");
			const cors = new Cors({ origins: ["*"] });
			const response = cors.apply(request, new Response());

			assert.equal(
				response.headers.get("Access-Control-Allow-Origin"),
				"*",
				"should respond with a wildcard if no origin is available",
			);
			assert.match(
				response.headers.get("Vary")!,
				/Origin/,
				"should modify the Vary header",
			);
		});
		it("adds requested wildcard origin", () => {
			const request = new Request("http://testing.local", {
				headers: { Origin: "http://testing.local" },
			});
			const cors = new Cors({ origins: ["*"] });
			const response = cors.apply(request, new Response());

			assert.equal(
				response.headers.get("Access-Control-Allow-Origin"),
				"http://testing.local",
				"should respond with the requested origin",
			);
			assert.match(
				response.headers.get("Vary")!,
				/Origin/,
				"should modify the Vary header",
			);
		});
		it("adds specific origins", () => {
			const request = new Request("http://testing.local", {
				headers: { Origin: "http://testing.local" },
			});
			const cors = new Cors({ origins: ["http://testing.local"] });
			const response = cors.apply(request, new Response());

			assert.equal(
				response.headers.get("Access-Control-Allow-Origin"),
				"http://testing.local",
				"should respond with the requested origin",
			);
			assert.match(
				response.headers.get("Vary")!,
				/Origin/,
				"should modify the Vary header",
			);
		});

		it("adds credentials", () => {
			const request = new Request("http://testing.local");
			const cors = new Cors({ credentials: true });
			const response = cors.apply(request, new Response());

			assert.equal(
				response.headers.get("Access-Control-Allow-Credentials"),
				"true",
			);
		});

		it("clones the response", async () => {
			const request = new Request("http://testing.local");
			const cors = new Cors();
			const response = cors.apply(
				request,
				new Response("ok", {
					status: 418,
					statusText: "I'm a teapot",
					headers: { "X-Hotel-Bar": "Hotel Bar" },
				}),
			);

			assert.equal(response.status, 418);
			assert.equal(response.statusText, "I'm a teapot");
			assert.equal(await response.text(), "ok");
			assert.equal(response.headers.get("X-Hotel-Bar"), "Hotel Bar");
		});
	});
});
