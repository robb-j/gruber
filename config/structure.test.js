import {
	assertEquals,
	assertInstanceOf,
	assertIsError,
	assertThrows,
	describe,
	it,
} from "../core/test-deps.js";
import { Structure } from "./mod.ts";

describe("Structure", () => {
	describe("constructor", () => {
		it("stores fields", () => {
			const result = new Structure("schema", "process");
			assertEquals(result.schema, "schema");
			assertEquals(result._process, "process");
		});
	});

	describe("#process", () => {
		it("calls process", () => {
			const struct = new Structure({}, () => 42);
			const result = struct.process();
			assertEquals(result, 42, "should call the internal process method");
		});
		it("passes input through", () => {
			const struct = new Structure({}, (value) => value);
			const result = struct.process(42);
			assertEquals(result, 42, "should pass through the input");
		});
		it("passes context through", () => {
			const struct = new Structure({}, (_value, context) => context);
			const result = struct.process(42, { path: ["some", "path"] });
			assertEquals(
				result,
				{ path: ["some", "path"] },
				"should pass through the context",
			);
		});
		it("wraps errors in Structure.Error", () => {
			const struct = new Structure({}, () => {
				throw new Error("input error");
			});
			const exec = () => struct.process(42, { path: ["some", "path"] });
			const error = assertThrows(exec, Structure.Error);
			assertEquals(error.message, "input error");
			assertEquals(error.path, ["some", "path"]);
		});
	});

	describe("#getSchema", () => {
		it("injects $schema", () => {
			const schema = { type: "string", default: "fallback" };
			const struct = new Structure(schema, () => {});
			assertEquals(
				struct.getSchema(),
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
			assertInstanceOf(struct, Structure);
		});
		it("allows strings", () => {
			const struct = Structure.string("fallback");
			assertEquals(
				struct.process("value"),
				"value",
				"should allow string values through",
			);
		});
		it("uses the fallback", () => {
			const struct = Structure.string("fallback");
			assertEquals(
				struct.process(undefined),
				"fallback",
				"should fall back to the default if undefined is passed",
			);
		});
		it("validates strings", () => {
			const struct = Structure.string("fallback");

			const error = assertThrows(
				() => struct.process(42, { path: ["some", "path"] }),
				Structure.Error,
			);
			assertEquals(error.message, "Expected a string");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("validates missing values", () => {
			const struct = Structure.string();

			const error = assertThrows(
				() => struct.process(undefined, { path: ["some", "path"] }),
				Structure.Error,
			);
			assertEquals(error.message, "Missing value");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("generates JSON schema", () => {
			const struct = Structure.string("fallback");
			assertEquals(struct.schema, { type: "string", default: "fallback" });
		});
	});

	describe("number", () => {
		it("creates a structure", () => {
			const struct = Structure.number(42);
			assertInstanceOf(struct, Structure);
		});
		it("allows numbers", () => {
			const struct = Structure.number(42);
			assertEquals(
				struct.process(33),
				33,
				"should allow number values through",
			);
		});
		it("uses the fallback", () => {
			const struct = Structure.number(42);
			assertEquals(
				struct.process(undefined),
				42,
				"should fall back to the default if undefined is passed",
			);
		});
		it("parses strings", () => {
			const struct = Structure.number(42);
			assertEquals(
				struct.process("33"),
				33,
				"should parse the integer out of the string",
			);
		});
		it("throws for non-numbers", () => {
			const struct = Structure.number(42);

			const error = assertThrows(
				() => struct.process("a string", { path: ["some", "path"] }),
				Structure.Error,
			);

			assertEquals(error.message, "Expected a number");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("validates missing values", () => {
			const struct = Structure.number();

			const error = assertThrows(
				() => struct.process(undefined, { path: ["some", "path"] }),
				Structure.Error,
			);
			assertEquals(error.message, "Missing value");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("validates NaN", () => {
			const struct = Structure.number();
			const error = assertThrows(
				() => struct.process(Number.NaN),
				Structure.Error,
			);
			assertEquals(error.message, "Not a number");
		});
		it("generates JSON schema", () => {
			const struct = Structure.number(42);
			assertEquals(struct.schema, { type: "number", default: 42 });
		});
	});

	describe("boolean", () => {
		it("creates a structure", () => {
			const struct = Structure.boolean(false);
			assertInstanceOf(struct, Structure);
		});
		it("allows booleans", () => {
			const struct = Structure.boolean(false);
			assertEquals(
				struct.process(true),
				true,
				"should allow boolean values through",
			);
		});
		it("uses the fallback", () => {
			const struct = Structure.boolean(false);
			assertEquals(
				struct.process(undefined),
				false,
				"should fall back to the default if undefined is passed",
			);
		});
		it("throws for non-booleans", () => {
			const struct = Structure.boolean(false);

			const error = assertThrows(
				() => struct.process("a string", { path: ["some", "path"] }),
				Structure.Error,
			);
			assertIsError(error, Structure.Error, "Not a boolean");
			assertEquals(error.path, ["some", "path"]);
		});
		it("generates JSON schema", () => {
			const struct = Structure.boolean(false);
			assertEquals(struct.schema, { type: "boolean", default: false });
		});
	});

	describe("url", () => {
		it("creates a structure", () => {
			const struct = Structure.url("https://fallback.example.com");
			assertInstanceOf(struct, Structure);
		});
		it("fail for invalid fallbacks", () => {
			assertThrows(() => Structure.url("not a URL"));
		});
		it("allows strings", () => {
			const struct = Structure.url("https://fallback.example.com");
			assertEquals(
				struct.process("https://example.com"),
				new URL("https://example.com"),
				"should allow strings and convert them to a URL",
			);
		});
		it("allows URLs", () => {
			const struct = Structure.url("https://fallback.example.com");
			assertEquals(
				struct.process(new URL("https://example.com")),
				new URL("https://example.com"),
				"should allow strings and convert them to a URL",
			);
		});
		it("uses the fallback", () => {
			const struct = Structure.url("https://fallback.example.com");
			assertEquals(
				struct.process(undefined),
				new URL("https://fallback.example.com"),
				"should fall back to the default if undefined is passed",
			);
		});
		it("validates non-strings", () => {
			const struct = Structure.url("https://fallback.example.com");

			const error = assertThrows(
				() => struct.process(42, { path: ["some", "path"] }),
				Structure.Error,
			);

			assertEquals(error.message, "Not a string or URL");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("validates missing values", () => {
			const struct = Structure.url();

			const error = assertThrows(
				() => struct.process(undefined, { path: ["some", "path"] }),
				Structure.Error,
			);
			assertEquals(error.message, "Missing value");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("generates JSON schema", () => {
			const struct = Structure.url("https://fallback.example.com");
			assertEquals(struct.schema, {
				type: "string",
				format: "uri",
				default: "https://fallback.example.com",
			});
		});
		it("stringifies URLs for JSON schema", () => {
			const struct = Structure.url(new URL("https://fallback.example.com"));
			assertEquals(struct.schema, {
				type: "string",
				format: "uri",
				default: "https://fallback.example.com/",
			});
		});
		it("catches URL errors", () => {
			const struct = Structure.url("https://example.com");
			const exec = () => struct.process("not a url");
			assertThrows(exec, Structure.Error);
		});
	});

	describe("object", () => {
		it("creates a structure", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			assertInstanceOf(struct, Structure);
		});
		it("generates JSON schema", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			assertEquals(struct.schema, {
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
			const error = assertThrows(
				() => struct.process("not an object", { path: ["some", "path"] }),
				Structure.Error,
			);

			assertEquals(error.message, "Expected an object");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("allows objects", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			const result = struct.process({ key: "value" });
			assertEquals(result, { key: "value" });
		});
		it("validates nested values", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			const error = assertThrows(
				() => struct.process({ key: 42 }),
				Structure.Error,
			);

			assertEquals(error.message, "Object does not match schema");
			assertEquals(error.path, []);
			assertEquals(error.children.length, 1, "should have one nested error");
			assertEquals(error.children[0].message, "Expected a string");
			assertEquals(error.children[0].path, ["key"], "should capture context");
		});
		it("throws for unknown fields", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			const error = assertThrows(
				() =>
					struct.process(
						{ key: "value", something: "else" },
						{ path: ["some", "path"] },
					),
				Structure.Error,
			);

			assertEquals(error.message, "Object does not match schema");
			assertEquals(error.path, ["some", "path"], "should capture the context");

			assertEquals(error.children[0].message, "Additional field not allowed");
			assertEquals(
				error.children[0].path,
				["some", "path", "something"],
				"should capture the context",
			);
		});
		it("throws for non-null prototypes", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			class Injector {
				key = "value";
			}
			const error = assertThrows(
				() => struct.process(new Injector(), { path: ["some", "path"] }),
				Structure.Error,
			);

			assertEquals(error.message, "Should not have a prototype");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("ignores undefined", () => {
			const struct = Structure.object({
				field: new Structure({}, () => undefined),
			});
			assertEquals(Object.keys(struct.process({})), []);
		});
	});

	describe("array", () => {
		it("creates a structure", () => {
			const struct = Structure.array(Structure.string());
			assertInstanceOf(struct, Structure);
		});
		it("generates JSON schema", () => {
			const struct = Structure.array(Structure.string());
			assertEquals(struct.schema, {
				type: "array",
				items: {
					type: "string",
				},
				default: [],
			});
		});
		it("throws for non-arrays", () => {
			const struct = Structure.array(Structure.string());
			const error = assertThrows(
				() => struct.process("not an object", { path: ["some", "path"] }),
				Structure.Error,
			);

			assertEquals(error.message, "Expected an array");
			assertEquals(error.path, ["some", "path"], "should capture the context");
		});
		it("allows arrays", () => {
			const struct = Structure.array(Structure.string());
			const result = struct.process(["a", "b", "c"]);
			assertEquals(result, ["a", "b", "c"]);
		});
		it("validates array items", () => {
			const struct = Structure.array(Structure.string());
			const error = assertThrows(
				() => struct.process(["a", 2, "c"]),
				Structure.Error,
			);

			assertEquals(error.message, "Array item does not match schema");
			assertEquals(error.path, []);
			assertEquals(error.children.length, 1, "should have one nested error");
			assertEquals(error.children[0].message, "Expected a string");
			assertEquals(error.children[0].path, ["1"], "should capture context");
		});
	});

	describe("literal", () => {
		it("creates a structure", () => {
			const struct = Structure.literal(42);
			assertInstanceOf(struct, Structure);
		});
		it("allows that value", () => {
			const struct = Structure.literal(42);
			assertEquals(struct.process(42), 42, "should pass the value through");
		});
		it("throws for different values", () => {
			const struct = Structure.literal(42);

			const error = assertThrows(
				() => struct.process(69, { path: ["some", "path"] }),
				Structure.Error,
			);
			assertIsError(error, Structure.Error, "Expected number literal: 42");
			assertEquals(error.path, ["some", "path"]);
		});
		it("throws for different types", () => {
			const struct = Structure.literal(42);

			const error = assertThrows(
				() => struct.process("nice", { path: ["some", "path"] }),
				Structure.Error,
			);
			assertIsError(error, Structure.Error, "Expected number literal: 42");
			assertEquals(error.path, ["some", "path"]);
		});
		it("throws for missing values", () => {
			const struct = Structure.literal(42);

			const error = assertThrows(
				() => struct.process(undefined, { path: ["some", "path"] }),
				Structure.Error,
			);

			assertIsError(error, Structure.Error, "Missing value");
			assertEquals(error.path, ["some", "path"]);
		});
	});

	describe("union", () => {
		it("creates a structure", () => {
			const struct = Structure.union([Structure.string(), Structure.number()]);
			assertInstanceOf(struct, Structure);
		});
		it("allows each value", () => {
			const struct = Structure.union([Structure.string(), Structure.number()]);
			assertEquals(struct.process(42), 42, "should pass the value through");
			assertEquals(
				struct.process("Geoff"),
				"Geoff",
				"should pass the value through",
			);
		});
		it("combines the schema", () => {
			const struct = Structure.union([Structure.string(), Structure.number()]);
			assertEquals(struct.schema, {
				oneOf: [{ type: "string" }, { type: "number" }],
			});
		});
		it("enables enums", () => {
			const struct = Structure.union([
				Structure.literal("a"),
				Structure.literal("b"),
				Structure.literal("c"),
			]);
			assertEquals(struct.process("a"), "a", "should pass the value through");
			assertEquals(struct.process("b"), "b", "should pass the value through");
			assertEquals(struct.process("c"), "c", "should pass the value through");
		});
		it("fails when no matches", () => {
			const struct = Structure.union([Structure.string(), Structure.number()]);
			const exec = () => struct.process(true);
			assertThrows(exec, Structure.Error);
		});
	});

	describe("fromJSONSchema", () => {
		it("parses constants", () => {
			const result = Structure.fromJSONSchema({ const: 42 });
			assertEquals(result.process(42), 42);
		});
		it("parses strings", () => {
			const result = Structure.fromJSONSchema({ type: "string" });
			assertEquals(result.process("Geoff Testington"), "Geoff Testington");
		});
		it("parses numbers", () => {
			const result = Structure.fromJSONSchema({ type: "number" });
			assertEquals(result.process(42), 42);
		});
		it("parses booleans", () => {
			const result = Structure.fromJSONSchema({ type: "boolean" });
			assertEquals(result.process(false), false);
		});
		it("parses arrays", () => {
			const result = Structure.fromJSONSchema({
				type: "array",
				items: { type: "string" },
			});
			assertEquals(result.process(["A", "B", "C"]), ["A", "B", "C"]);
		});
		it("parses objects", () => {
			const result = Structure.fromJSONSchema({
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"],
			});
			assertEquals(result.process({ name: "Geoff" }), { name: "Geoff" });
		});
		it("parses objects with optionals", () => {
			const result = Structure.fromJSONSchema({
				type: "object",
				properties: { name: { type: "string" } },
			});
			assertEquals(result.process({}), {});
		});
		it("parses unions", () => {
			const result = Structure.fromJSONSchema({
				anyOf: [{ type: "string" }, { type: "number" }],
			});
			assertEquals(result.process("Geoff Testington"), "Geoff Testington");
			assertEquals(result.process(42), 42);
		});
		it("throws for unknown", () => {
			assertThrows(() => Structure.fromJSONSchema({}));
		});
	});

	describe("tuple", () => {
		const struct = Structure.tuple([
			Structure.string(),
			Structure.number(),
			Structure.literal("magic"),
		]);

		it("allows matching arrays", () => {
			assertEquals(struct.process(["Geoff T", 42, "magic"]), [
				"Geoff T",
				42,
				"magic",
			]);
		});
		it("blocks subsets", () => {
			assertThrows(() => struct.process(["Geoff T", 42]));
		});
		it("blocks invalid", () => {
			assertThrows(() => struct.process([42, "Geoff T", new Date()]));
		});
	});

	describe("record", () => {
		it("allows matching key-value pairs", () => {
			const struct = Structure.record(Structure.string(), Structure.number());
			const value = struct.process({ age: 42 });
			assertEquals(value, { age: 42 });
		});
		it("allows enum keys", () => {
			const struct = Structure.record(
				Structure.enum(["name", "pet"]),
				Structure.string(),
			);
			const value = struct.process({ name: "Geoff T" });
			assertEquals(value, { name: "Geoff T" });
		});
		it("blocks invalid keys", () => {
			const struct = Structure.record(
				Structure.literal("name"),
				Structure.string(),
			);

			assertThrows(
				() => struct.process({ pet: "Hugo" }),
				(error) => error instanceof Structure.Error,
			);
		});
		it("blocks invalid values", () => {
			const struct = Structure.record(
				Structure.literal("name"),
				Structure.string(),
			);

			assertThrows(
				() => struct.process({ name: 119 }),
				(error) => error instanceof Structure.Error,
			);
		});
	});

	describe("null", () => {
		const struct = Structure.null();

		it("allows null", () => {
			assertEquals(struct.process(null), null);
		});
		it("blocks not-null", () => {
			assertThrows(
				() => struct.process("a string"),
				(error) => error instanceof Structure.Error,
			);
		});
	});

	describe("any", () => {
		const struct = Structure.any();

		it("allows strings", () => {
			assertEquals(struct.process("a string"), "a string");
		});
		it("allows numbers", () => {
			assertEquals(struct.process(42), 42);
		});
		it("allows booleans", () => {
			assertEquals(struct.process(false), false);
		});
		it("allows objects", () => {
			assertEquals(struct.process({ name: "Geoff" }), { name: "Geoff" });
		});
		it("allows arrays", () => {
			assertEquals(struct.process([1, 2, 3]), [1, 2, 3]);
		});
	});

	describe("partial", () => {
		it("allows all values", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			const result = struct.process({ name: "Geoff Testington", age: 42 });

			assertEquals(result, {
				name: "Geoff Testington",
				age: 42,
			});
		});
		it("allows some values", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			assertEquals(struct.process({ name: "Geoff Testington" }), {
				name: "Geoff Testington",
			});
		});
		it("allows no values", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			assertEquals(struct.process({}), {});
		});
		it("defaults", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			assertEquals(struct.process(), {});
		});
		it("sets schema", () => {
			const struct = Structure.partial({
				name: Structure.string(),
				age: Structure.number(),
			});

			assertEquals(struct.schema, {
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
			assertEquals(
				struct.process(new Date("2025-05-04 12:34:56")),
				new Date("2025-05-04 12:34:56"),
			);
		});
		it("parses strings", () => {
			const struct = Structure.date();
			assertEquals(
				struct.process("2025-05-04 12:34:56"),
				new Date("2025-05-04 12:34:56"),
			);
		});
		// https://json-schema.org/draft/2020-12/draft-bhutton-json-schema-validation-00#rfc.section.7.3.1
		it("sets schema", () => {
			const struct = Structure.date();
			assertEquals(struct.schema, {
				type: "string",
				format: "date-time",
			});
		});
	});
});
