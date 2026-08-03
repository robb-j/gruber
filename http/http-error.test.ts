import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { HTTPError } from "./http-error.ts";

describe("HTTPError", () => {
	describe("constructor", () => {
		it("creates the error", () => {
			const result = new HTTPError(418, "I'm a teapot");
			assert.equal(result.status, 418);
			assert.equal(result.statusText, "I'm a teapot");
			assert.equal(result.name, "HTTPError");
		});
	});

	describe("toResponse", () => {
		it("creates the error", () => {
			const result = new HTTPError(200, "OK").toResponse();
			assert.equal(result.status, 200);
			assert.equal(result.statusText, "OK");
		});
		it("sets headers", () => {
			const error = new HTTPError(200, "OK", undefined, {
				"X-HOTEL-BAR": "Hotel Bar?",
			});

			const result = error.toResponse();
			assert.equal(result.headers.get("X-HOTEL-BAR"), "Hotel Bar?");
		});
	});

	describe("badRequest", () => {
		it("creates the error", () => {
			const result = HTTPError.badRequest("body");
			assert.equal(result.status, 400);
			assert.equal(result.statusText, "Bad Request");
		});
	});

	describe("unauthorized", () => {
		it("creates the error", () => {
			const result = HTTPError.unauthorized();
			assert.equal(result.status, 401);
			assert.equal(result.statusText, "Unauthorized");
		});
	});

	describe("notFound", () => {
		it("creates the error", () => {
			const result = HTTPError.notFound();
			assert.equal(result.status, 404);
			assert.equal(result.statusText, "Not Found");
		});
	});

	describe("internalServerError", () => {
		it("creates the error", () => {
			const result = HTTPError.internalServerError();
			assert.equal(result.status, 500);
			assert.equal(result.statusText, "Internal Server Error");
		});

		describe("notImplemented", () => {
			it("creates the error", () => {
				const result = HTTPError.notImplemented();
				assert.equal(result.status, 501);
				assert.equal(result.statusText, "Not Implemented");
			});
		});
	});
});
