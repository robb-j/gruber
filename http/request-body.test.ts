import { describe, it } from "node:test";
import assert from "node:assert/strict";

import * as ark from "arktype";
import * as zod from "zod";
import * as valibot from "valibot";

import { Structure } from "../config/mod.ts";
import { assertRequestBody, getRequestBody } from "./request-body.ts";

describe("getRequestBody", () => {
	it("parses FormData", async () => {
		const body = new FormData();
		body.set("name", "Geoff Testington");
		const request = new Request("http://testing.local", {
			method: "POST",
			body,
		});

		const result = await getRequestBody(request);
		assert.equal(result.get("name"), "Geoff Testington");
	});
	it("parses JSON", async () => {
		const request = new Request("http://testing.local", {
			method: "POST",
			body: JSON.stringify({ name: "Geoff Testington" }),
			headers: {
				"Content-Type": "application/json",
			},
		});

		const result = await getRequestBody(request);
		assert.deepEqual(result, { name: "Geoff Testington" });
	});
});

describe("assertRequestBody", () => {
	const struct = Structure.object({
		name: Structure.string(),
	});
	it("validates json", () => {
		const result = assertRequestBody(struct, {
			name: "Geoff Testington",
		});

		assert.deepEqual(result, { name: "Geoff Testington" });
	});
	it("validates FormData", () => {
		const data = new FormData();
		data.set("name", "Geoff Testington");
		const result = assertRequestBody(struct, data);

		assert.deepEqual(result, { name: "Geoff Testington" });
	});
	it("validates URLSearchParams", () => {
		const data = new URLSearchParams();
		data.set("name", "Geoff Testington");
		const result = assertRequestBody(struct, data);

		assert.deepEqual(result, { name: "Geoff Testington" });
	});
	it("validates a json Request", async () => {
		const result = await assertRequestBody(
			struct,
			new Request("http://testing.local", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name: "Geoff Testington" }),
			}),
		);

		assert.deepEqual(result, { name: "Geoff Testington" });
	});
	it("validates a FormData Request", async () => {
		const data = new FormData();
		data.set("name", "Geoff Testington");
		const result = await assertRequestBody(
			struct,
			new Request("http://testing.local", { method: "POST", body: data }),
		);

		assert.deepEqual(result, { name: "Geoff Testington" });
	});
	it("validates with zod", async () => {
		const schema = zod.object({
			name: zod.string(),
		});

		const result = assertRequestBody(schema, {
			name: "Geoff Testington",
		});

		assert.deepEqual(result, { name: "Geoff Testington" });
	});
	it("validates with valibot", async () => {
		const schema = valibot.object({
			name: valibot.string(),
		});

		const result = assertRequestBody(schema, {
			name: "Geoff Testington",
		});

		assert.deepEqual(result, { name: "Geoff Testington" });
	});
	it("validates with valibot", async () => {
		const schema = ark.type({
			name: "string",
		});

		const result = assertRequestBody(schema, {
			name: "Geoff Testington",
		});

		assert.deepEqual(result, { name: "Geoff Testington" });
	});
});
