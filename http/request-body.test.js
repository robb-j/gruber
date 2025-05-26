import { describe, it, assertEquals } from "../core/test-deps.js";
import { getRequestBody, assertRequestBody } from "./request-body.ts";
import { Structure } from "../config/mod.ts";

describe("getRequestBody", () => {
	it("parses FormData", async () => {
		const body = new FormData();
		body.set("name", "Geoff Testington");
		const request = new Request("http://testing.local", {
			method: "POST",
			body,
		});

		const result = await getRequestBody(request);
		assertEquals(result.get("name"), "Geoff Testington");
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
		assertEquals(result, { name: "Geoff Testington" });
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

		assertEquals(result, { name: "Geoff Testington" });
	});
	it("validates FormData", () => {
		const data = new FormData();
		data.set("name", "Geoff Testington");
		const result = assertRequestBody(struct, data);

		assertEquals(result, { name: "Geoff Testington" });
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

		assertEquals(result, { name: "Geoff Testington" });
	});
	it("validates a FormData Request", async () => {
		const data = new FormData();
		data.set("name", "Geoff Testington");
		const result = await assertRequestBody(
			struct,
			new Request("http://testing.local", { method: "POST", body: data }),
		);

		assertEquals(result, { name: "Geoff Testington" });
	});
});
