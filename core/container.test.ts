import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Container } from "./container.ts";

describe("Container", () => {
	describe("constructor", () => {
		it("stores deps", () => {
			const result = new Container({
				message: () => "hello there",
			});
			assert.equal(result.get("message"), "hello there");
		});
	});

	describe("override", () => {
		it("overrides deps", () => {
			const container = new Container({
				message: () => "hello there",
			});
			container.override({ message: "general kenobi" });
			assert.equal(container.overrides.get("message"), "general kenobi");
		});
		it("injects unmet dependencies", () => {
			const container = new Container({
				message: () => "hello there",
				repo: () => {},
			});
			container.override({});
			assert.throws(() => (container.get("message") as any).unknown_value);
		});
	});

	describe("reset", () => {
		it("clears overrides", () => {
			const container = new Container({
				message: () => "hello there",
			});
			container.override({ message: "general kenobi" });
			container.reset();

			assert.equal(container.get("message"), "hello there");
		});
	});

	describe("get", () => {
		it("returns the dep", () => {
			const container = new Container({
				message: () => "hello there",
			});
			assert.equal(container.get("message"), "hello there");
		});
		it("returns an override", () => {
			const container = new Container({
				message: () => "hello there",
			});
			container.override({ message: "general kenobi" });
			assert.equal(container.get("message"), "general kenobi");
		});
		it("only unwaps once", () => {
			let index = 1;
			const container = new Container({
				message: () => `hello there ${index++}`,
			});
			assert.equal(container.get("message"), "hello there 1");
			assert.equal(container.get("message"), "hello there 1");
			assert.equal(container.get("message"), "hello there 1");
		});
	});

	describe("unwrap", () => {
		it("stores the dep", () => {
			const container = new Container({
				message: () => "hello there",
			});
			assert.equal(container.unwrap("message"), "hello there");
			assert.equal(container.unwrapped.get("message"), "hello there");
		});
	});

	describe("proxy", () => {
		it("proxies around the deps", () => {
			const container = new Container({
				message: () => "hello there",
			});
			const result = container.proxy({ age: 42 });
			assert.equal(result.age, 42);
		});
		it("injects deps", () => {
			const container = new Container({
				message: () => "hello there",
			});
			const result = container.proxy({ age: 42 });
			assert.equal(result.message, "hello there");
		});
	});
});
