import { assertEquals, describe, assertThrows, it } from "./test-deps.js";
import { Container } from "./container.ts";

describe("Container", () => {
	describe("constructor", () => {
		it("stores deps", () => {
			const result = new Container({
				message: () => "hello there",
			});
			assertEquals(result.get("message"), "hello there");
		});
	});

	describe("override", () => {
		it("overrides deps", () => {
			const container = new Container({
				message: () => "hello there",
			});
			container.override({ message: "general kenobi" });
			assertEquals(container.overrides.get("message"), "general kenobi");
		});
		it("overrides injects unmet dependencies", () => {
			const container = new Container({
				message: () => "hello there",
				repo: () => {},
			});
			container.override({});
			assertThrows(() => container.get("message").value);
		});
	});

	describe("reset", () => {
		it("clears overrides", () => {
			const container = new Container({
				message: () => "hello there",
			});
			container.override({ message: "general kenobi" });
			container.reset();

			assertEquals(container.get("message"), "hello there");
		});
	});

	describe("get", () => {
		it("returns the dep", () => {
			const container = new Container({
				message: () => "hello there",
			});
			assertEquals(container.get("message"), "hello there");
		});
		it("returns an override", () => {
			const container = new Container({
				message: () => "hello there",
			});
			container.override({ message: "general kenobi" });
			assertEquals(container.get("message"), "general kenobi");
		});
		it("only unwaps once", () => {
			let index = 1;
			const container = new Container({
				message: () => `hello there ${index++}`,
			});
			assertEquals(container.get("message"), "hello there 1");
			assertEquals(container.get("message"), "hello there 1");
			assertEquals(container.get("message"), "hello there 1");
		});
	});

	describe("unwrap", () => {
		it("stores the dep", () => {
			const container = new Container({
				message: () => "hello there",
			});
			assertEquals(container.unwrap("message"), "hello there");
			assertEquals(container.unwrapped.get("message"), "hello there");
		});
	});

	describe("proxy", () => {
		it("proxies around the deps", () => {
			const container = new Container({
				message: () => "hello there",
			});
			const result = container.proxy({ age: 42 });
			assertEquals(result.age, 42);
		});
		it("injects deps", () => {
			const container = new Container({
				message: () => "hello there",
			});
			const result = container.proxy({ age: 42 });
			assertEquals(result.message, "hello there");
		});
	});
});
