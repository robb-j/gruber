import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Structure, type StructContext } from "./mod.ts";
import { spy } from "../testing/mod.ts";
import { message } from "valibot";

function _ctx(path: string[]): StructContext {
	return { type: "sync", path };
}

describe("Structure", () => {
	describe("constructor", () => {
		it("stores fields", () => {
			const fn = spy(() => {});
			const result = new Structure({}, fn);
			assert.deepEqual(result.schema, {});
			assert.equal(result._process, fn);
		});
	});

	describe("#process", () => {
		it("calls process", () => {
			const struct = new Structure({}, () => 42);
			const result = struct.process();
			assert.equal(result, 42, "should call the internal process method");
		});
		it("passes input through", () => {
			const struct = new Structure({}, (value) => value);
			const result = struct.process(42);
			assert.equal(result, 42, "should pass through the input");
		});
		it("passes context through", () => {
			const struct = new Structure({}, (_value, context) => context);
			const result = struct.process(42, {
				type: "sync",
				path: ["some", "path"],
			});
			assert.deepEqual(
				result,
				_ctx(["some", "path"]),
				"should pass through the context",
			);
		});
		it("wraps errors in Structure.Error", () => {
			const struct = new Structure({}, () => {
				throw new Error("input error");
			});
			const exec = () => struct.process(42, _ctx(["some", "path"]));
			assert.throws(exec, {
				name: "Structure.Error",
				message: "input error",
				path: ["some", "path"],
			});
		});
	});

	describe("#getFullSchema", () => {
		it("injects $schema", () => {
			const schema = { type: "string", default: "fallback" };
			const struct = new Structure(schema, () => {});
			assert.deepEqual(
				struct.getFullSchema(),
				{
					$schema: "https://json-schema.org/draft/2020-12/schema",
					type: "string",
					default: "fallback",
				},
				"should add the $schema variable to make it a valid JSON schema",
			);
		});
	});

	describe("string", () => {
		it("creates a structure", () => {
			const struct = Structure.string("fallback");
			assert(struct instanceof Structure);
		});
		it("allows strings", () => {
			const struct = Structure.string("fallback");
			assert.equal(
				struct.process("value"),
				"value",
				"should allow string values through",
			);
		});
		it("uses the fallback", () => {
			const struct = Structure.string("fallback");
			assert.equal(
				struct.process(undefined),
				"fallback",
				"should fall back to the default if undefined is passed",
			);
		});
		it("validates strings", () => {
			const struct = Structure.string("fallback");
			const exec = () => struct.process(42, _ctx(["some", "path"]));

			assert.throws(exec, {
				name: "Structure.Error",
				message: "Expected a string",
				path: ["some", "path"],
			});
		});
		it("validates missing values", () => {
			const struct = Structure.string();

			assert.throws(() => struct.process(undefined, _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Missing value",
				path: ["some", "path"],
			});
		});
		it("generates JSON schema", () => {
			const struct = Structure.string("fallback");
			assert.deepEqual(struct.schema, { type: "string", default: "fallback" });
		});
	});

	describe("number", () => {
		it("creates a structure", () => {
			const struct = Structure.number(42);
			assert(struct instanceof Structure);
		});
		it("allows numbers", () => {
			const struct = Structure.number(42);
			assert.equal(
				struct.process(33),
				33,
				"should allow number values through",
			);
		});
		it("uses the fallback", () => {
			const struct = Structure.number(42);
			assert.equal(
				struct.process(undefined),
				42,
				"should fall back to the default if undefined is passed",
			);
		});
		it("parses strings", () => {
			const struct = Structure.number(42);
			assert.equal(
				struct.process("33"),
				33,
				"should parse the integer out of the string",
			);
		});
		it("throws for non-numbers", () => {
			const struct = Structure.number(42);

			assert.throws(() => struct.process("a string", _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Expected a number",
				path: ["some", "path"],
			});
		});
		it("validates missing values", () => {
			const struct = Structure.number();

			assert.throws(() => struct.process(undefined, _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Missing value",
				path: ["some", "path"],
			});
		});
		it("validates NaN", () => {
			const struct = Structure.number();
			assert.throws(() => struct.process(Number.NaN), {
				name: "Structure.Error",
				message: "Not a number",
			});
		});
		it("generates JSON schema", () => {
			const struct = Structure.number(42);
			assert.deepEqual(struct.schema, { type: "number", default: 42 });
		});
	});

	describe("boolean", () => {
		it("creates a structure", () => {
			const struct = Structure.boolean(false);
			assert(struct instanceof Structure);
		});
		it("allows booleans", () => {
			const struct = Structure.boolean(false);
			assert.equal(
				struct.process(true),
				true,
				"should allow boolean values through",
			);
		});
		it("uses the fallback", () => {
			const struct = Structure.boolean(false);
			assert.equal(
				struct.process(undefined),
				false,
				"should fall back to the default if undefined is passed",
			);
		});
		it("throws for non-booleans", () => {
			const struct = Structure.boolean(false);

			assert.throws(() => struct.process("a string", _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Not a boolean",
				path: ["some", "path"],
			});
		});
		it("generates JSON schema", () => {
			const struct = Structure.boolean(false);
			assert.deepEqual(struct.schema, { type: "boolean", default: false });
		});
	});

	describe("url", () => {
		it("creates a structure", () => {
			const struct = Structure.url("https://fallback.example.com");
			assert(struct instanceof Structure);
		});
		it("fail for invalid fallbacks", () => {
			assert.throws(() => Structure.url("not a URL"));
		});
		it("allows strings", () => {
			const struct = Structure.url("https://fallback.example.com");
			assert.deepEqual(
				struct.process("https://example.com"),
				new URL("https://example.com"),
				"should allow strings and convert them to a URL",
			);
		});
		it("allows URLs", () => {
			const struct = Structure.url("https://fallback.example.com");
			assert.deepEqual(
				struct.process(new URL("https://example.com")),
				new URL("https://example.com"),
				"should allow strings and convert them to a URL",
			);
		});
		it("uses the fallback", () => {
			const struct = Structure.url("https://fallback.example.com");
			assert.deepEqual(
				struct.process(undefined),
				new URL("https://fallback.example.com"),
				"should fall back to the default if undefined is passed",
			);
		});
		it("validates non-strings", () => {
			const struct = Structure.url("https://fallback.example.com");

			assert.throws(() => struct.process(42, _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Not a string or URL",
				path: ["some", "path"],
			});
		});
		it("validates missing values", () => {
			const struct = Structure.url();

			assert.throws(() => struct.process(undefined, _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Missing value",
				path: ["some", "path"],
			});
		});
		it("generates JSON schema", () => {
			const struct = Structure.url("https://fallback.example.com");
			assert.deepEqual(struct.schema, {
				type: "string",
				format: "uri",
				default: "https://fallback.example.com",
			});
		});
		it("stringifies URLs for JSON schema", () => {
			const struct = Structure.url(new URL("https://fallback.example.com"));
			assert.deepEqual(struct.schema, {
				type: "string",
				format: "uri",
				default: "https://fallback.example.com/",
			});
		});
		it("catches URL errors", () => {
			const struct = Structure.url("https://example.com");
			const exec = () => struct.process("not a url");
			assert.throws(exec, {
				name: "Structure.Error",
			});
		});
	});

	describe("object", () => {
		it("creates a structure", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			assert(struct instanceof Structure);
		});
		it("generates JSON schema", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			assert.deepEqual(struct.schema, {
				type: "object",
				properties: {
					key: {
						type: "string",
						default: "fallback",
					},
				},
				default: {},
				additionalProperties: false,
				required: ["key"],
			});
		});
		it("throws for non-objects", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			assert.throws(
				() => struct.process("not an object", _ctx(["some", "path"])),
				{
					name: "Structure.Error",
					message: "Expected an object",
					path: ["some", "path"],
				},
			);
		});
		it("allows objects", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			const result = struct.process({ key: "value" });
			assert.deepEqual(result, { key: "value" });
		});
		it("validates nested values", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			assert.throws(() => struct.process({ key: 42 }), {
				name: "Structure.Error",
				message: "Object does not match schema",
				path: [],
				children: [new Structure.Error("Expected a string", ["key"])],
			});
		});
		it("throws for unknown fields", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			assert.throws(
				() =>
					struct.process(
						{ key: "value", something: "else" },
						_ctx(["some", "path"]),
					),
				{
					name: "Structure.Error",
					message: "Object does not match schema",
					path: ["some", "path"],
					children: [
						new Structure.Error("Additional field not allowed", [
							"some",
							"path",
							"something",
						]),
					],
				},
			);
		});
		it("throws for non-null prototypes", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			class Injector {
				key = "value";
			}
			assert.throws(
				() => struct.process(new Injector(), _ctx(["some", "path"])),
				{
					name: "Structure.Error",
					message: "Should not have a prototype",
					path: ["some", "path"],
				},
			);
		});
		it("ignores undefined", () => {
			const struct = Structure.object({
				field: new Structure({}, () => undefined),
			});
			assert.deepEqual(Object.keys(struct.process({})), []);
		});
	});

	describe("type", () => {
		it("creates a structure", () => {
			const struct = Structure.pick({});
			assert(struct instanceof Structure);
		});
		it("plucks keys off the input", () => {
			const struct = Structure.pick({
				name: Structure.string("name"),
				age: Structure.number(39),
			});
			const value = struct.process({
				name: "Geoff",
				age: 42,
				pets: ["Hugo"],
			});
			assert.deepEqual(value, {
				name: "Geoff",
				age: 42,
			});
		});
	});

	describe("array", () => {
		it("creates a structure", () => {
			const struct = Structure.array(Structure.string());
			assert(struct instanceof Structure);
		});
		it("generates JSON schema", () => {
			const struct = Structure.array(Structure.string());
			assert.deepEqual(struct.schema, {
				type: "array",
				items: {
					type: "string",
				},
				default: [],
			});
		});
		it("throws for non-arrays", () => {
			const struct = Structure.array(Structure.string());
			assert.throws(
				() => struct.process("not an object", _ctx(["some", "path"])),
				{
					name: "Structure.Error",
					message: "Expected an array",
					path: ["some", "path"],
				},
			);
		});
		it("allows arrays", () => {
			const struct = Structure.array(Structure.string());
			const result = struct.process(["a", "b", "c"]);
			assert.deepEqual(result, ["a", "b", "c"]);
		});
		it("validates array items", () => {
			const struct = Structure.array(Structure.string());
			assert.throws(() => struct.process(["a", 2, "c"]), {
				name: "Structure.Error",
				message: "Array item does not match schema",
				path: [],
				children: [new Structure.Error("Expected a string", ["1"])],
			});
		});
	});

	describe("literal", () => {
		it("creates a structure", () => {
			const struct = Structure.literal(42);
			assert(struct instanceof Structure);
		});
		it("allows that value", () => {
			const struct = Structure.literal(42);
			assert.equal(struct.process(42), 42, "should pass the value through");
		});
		it("throws for different values", () => {
			const struct = Structure.literal(42);

			assert.throws(() => struct.process(69, _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Expected number literal: 42",
				path: ["some", "path"],
			});
		});
		it("throws for different types", () => {
			const struct = Structure.literal(42);

			assert.throws(() => struct.process("nice", _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Expected number literal: 42",
				path: ["some", "path"],
			});
		});
		it("throws for missing values", () => {
			const struct = Structure.literal(42);

			assert.throws(() => struct.process(undefined, _ctx(["some", "path"])), {
				name: "Structure.Error",
				message: "Missing value",
				path: ["some", "path"],
			});
		});
	});

	describe("union", () => {
		it("creates a structure", () => {
			const struct = Structure.union([Structure.string(), Structure.number()]);
			assert(struct instanceof Structure);
		});
		it("allows each value", () => {
			const struct = Structure.union([Structure.string(), Structure.number()]);
			assert.equal(struct.process(42), 42, "should pass the value through");
			assert.equal(
				struct.process("Geoff"),
				"Geoff",
				"should pass the value through",
			);
		});
		it("combines the schema", () => {
			const struct = Structure.union([Structure.string(), Structure.number()]);
			assert.deepEqual(struct.schema, {
				oneOf: [{ type: "string" }, { type: "number" }],
			});
		});
		it("enables enums", () => {
			const struct = Structure.union([
				Structure.literal("a"),
				Structure.literal("b"),
				Structure.literal("c"),
			]);
			assert.equal(struct.process("a"), "a", "should pass the value through");
			assert.equal(struct.process("b"), "b", "should pass the value through");
			assert.equal(struct.process("c"), "c", "should pass the value through");
		});
		it("fails when no matches", () => {
			const struct = Structure.union([Structure.string(), Structure.number()]);
			const exec = () => struct.process(true);
			assert.throws(exec, Structure.Error);
		});
	});

	describe("fromJSONSchema", () => {
		it("parses constants", () => {
			const result = Structure.fromJSONSchema({ const: 42 });
			assert.equal(result.process(42), 42);
		});
		it("parses strings", () => {
			const result = Structure.fromJSONSchema({ type: "string" });
			assert.equal(result.process("Geoff Testington"), "Geoff Testington");
		});
		it("parses numbers", () => {
			const result = Structure.fromJSONSchema({ type: "number" });
			assert.equal(result.process(42), 42);
		});
		it("parses booleans", () => {
			const result = Structure.fromJSONSchema({ type: "boolean" });
			assert.equal(result.process(false), false);
		});
		it("parses arrays", () => {
			const result = Structure.fromJSONSchema({
				type: "array",
				items: { type: "string" },
			});
			assert.deepEqual(result.process(["A", "B", "C"]), ["A", "B", "C"]);
		});
		it("parses objects", () => {
			const result = Structure.fromJSONSchema({
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"],
			});
			assert.deepEqual(result.process({ name: "Geoff" }), { name: "Geoff" });
		});
		it("parses objects with optionals", () => {
			const result = Structure.fromJSONSchema({
				type: "object",
				properties: { name: { type: "string" } },
			});
			assert.deepEqual(result.process({}), {});
		});
		it("parses unions", () => {
			const result = Structure.fromJSONSchema({
				anyOf: [{ type: "string" }, { type: "number" }],
			});
			assert.equal(result.process("Geoff Testington"), "Geoff Testington");
			assert.equal(result.process(42), 42);
		});
		it("throws for unknown", () => {
			assert.throws(() => Structure.fromJSONSchema({}));
		});
	});

	describe("tuple", () => {
		const struct = Structure.tuple([
			Structure.string(),
			Structure.number(),
			Structure.literal("magic"),
		]);

		it("allows matching arrays", () => {
			assert.deepEqual(struct.process(["Geoff T", 42, "magic"]), [
				"Geoff T",
				42,
				"magic",
			]);
		});
		it("blocks subsets", () => {
			assert.throws(() => struct.process(["Geoff T", 42]));
		});
		it("blocks invalid", () => {
			assert.throws(() => struct.process([42, "Geoff T", new Date()]));
		});
	});

	describe("record", () => {
		it("allows matching key-value pairs", () => {
			const struct = Structure.record(Structure.string(), Structure.number());
			const value = struct.process({ age: 42 });
			assert.deepEqual(value, { age: 42 });
		});
		it("allows enum keys", () => {
			const struct = Structure.record(
				Structure.enum(["name", "pet"]),
				Structure.string(),
			);
			const value = struct.process({ name: "Geoff T" });
			assert.deepEqual(value, { name: "Geoff T" });
		});
		it("blocks invalid keys", () => {
			const struct = Structure.record(
				Structure.literal("name"),
				Structure.string(),
			);

			assert.throws(
				() => struct.process({ pet: "Hugo" }),
				(error) => error instanceof Structure.Error,
			);
		});
		it("blocks invalid values", () => {
			const struct = Structure.record(
				Structure.literal("name"),
				Structure.string(),
			);

			assert.throws(
				() => struct.process({ name: 119 }),
				(error) => error instanceof Structure.Error,
			);
		});
	});

	describe("null", () => {
		const struct = Structure.null();

		it("allows null", () => {
			assert.equal(struct.process(null), null);
		});
		it("blocks not-null", () => {
			assert.throws(
				() => struct.process("a string"),
				(error) => error instanceof Structure.Error,
			);
		});
	});

	describe("any", () => {
		const struct = Structure.any();

		it("allows strings", () => {
			assert.equal(struct.process("a string"), "a string");
		});
		it("allows numbers", () => {
			assert.equal(struct.process(42), 42);
		});
		it("allows booleans", () => {
			assert.equal(struct.process(false), false);
		});
		it("allows objects", () => {
			assert.deepEqual(struct.process({ name: "Geoff" }), { name: "Geoff" });
		});
		it("allows arrays", () => {
			assert.deepEqual(struct.process([1, 2, 3]), [1, 2, 3]);
		});
	});

	describe("partial", () => {
		it("allows all values", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			const result = struct.process({ name: "Geoff Testington", age: 42 });

			assert.deepEqual(result, {
				name: "Geoff Testington",
				age: 42,
			});
		});
		it("allows some values", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			assert.deepEqual(struct.process({ name: "Geoff Testington" }), {
				name: "Geoff Testington",
			});
		});
		it("allows no values", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			assert.deepEqual(struct.process({}), {});
		});
		it("defaults", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			assert.deepEqual(struct.process(), {});
		});
		it("sets schema", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			assert.deepEqual(struct.schema, {
				type: "object",
				properties: {
					name: { type: "string" },
					age: { type: "number" },
				},
				default: {},
				additionalProperties: false,
			});
		});
	});

	describe("date", () => {
		it("allows dates", () => {
			const struct = Structure.date();
			assert.deepEqual(
				struct.process(new Date("2025-05-04 12:34:56")),
				new Date("2025-05-04 12:34:56"),
			);
		});
		it("parses strings", () => {
			const struct = Structure.date();
			assert.deepEqual(
				struct.process("2025-05-04 12:34:56"),
				new Date("2025-05-04 12:34:56"),
			);
		});
		// https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-00#rfc.section.7.3.1
		it("sets schema", () => {
			const struct = Structure.date();
			assert.deepEqual(struct.schema, {
				type: "string",
				format: "date-time",
			});
		});
	});
});
