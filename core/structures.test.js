import { StructError, Structure } from "./structures.js";
import {
	assertEquals,
	assertThrows,
	describe,
	it,
	assertInstanceOf,
} from "./test-deps.js";

describe("StructError", () => {
	describe("constructor", () => {
		it("stores values", () => {
			const err = new StructError("error message", "some.path");
			assertEquals(err.path, "some.path");
			assertEquals(err.message, "error message");
			assertEquals(err.name, "StructError");
		});
		it("stores children", () => {
			const child = new StructError("child message", "path");
			const parent = new StructError("parent message", "path", [child]);
			assertEquals(parent.children, [child]);
		});
	});

	describe("chain", () => {
		it("returns StructErrors", () => {
			const ctx = { path: ["some", "path"] };
			const result = StructError.chain(
				new StructError("error message", ["another", "path"]),
				ctx,
			);
			assertEquals(
				result,
				new StructError("error message", ["another", "path"]),
				"returns the StructError without modifying the path",
			);
		});
		it("wraps Errors", () => {
			const ctx = { path: ["some", "path"] };
			const result = StructError.chain(new Error("error message"), ctx);
			assertEquals(
				result,
				new StructError("error message", ["some", "path"]),
				"creates a StructError and sets the path from the context",
			);
		});
		it("wraps non-Errors", () => {
			const ctx = { path: ["some", "path"] };
			const result = StructError.chain("unknown", ctx);
			assertEquals(
				result,
				new StructError("Unknown error", ["some", "path"]),
				"creates a generic StructError",
			);
		});
	});

	describe("getOneLiner", () => {
		it("formats the error", () => {
			const error = new StructError("error message", ["some", "path"]);
			assertEquals(error.getOneLiner(), "some.path — error message");
		});
	});

	describe("[Symbol.iterator]", () => {
		it("yields children", () => {
			const error = new StructError(
				"error message",
				["some", "path"],
				[
					new StructError("child a"),
					new StructError("child b"),
					new StructError("child c"),
				],
			);
			assertEquals(
				Array.from(error, (i) => i.message),
				["child a", "child b", "child c"],
				"should yield each child",
			);
		});
		it("yields nested children", () => {
			const error = new StructError(
				"parent a",
				["some"],
				[
					new StructError(
						"parent b",
						["path"],
						[
							new StructError("child a"),
							new StructError("child b"),
							new StructError("child c"),
						],
					),
				],
			);
			assertEquals(
				Array.from(error, (i) => i.message),
				["child a", "child b", "child c"],
				"should yield all nested children which have no children of their own",
			);
		});
	});

	describe("toFriendlyString", () => {
		it("formats a message", () => {
			const error = new StructError(
				"parent message",
				["some", "path"],
				[
					new StructError("child a", ["some", "path", "a"]),
					new StructError("child b", ["some", "path", "b"]),
					new StructError("child c", ["some", "path", "c"]),
				],
			);

			assertEquals(
				error.toFriendlyString(),
				[
					"parent message",
					"  some.path.a — child a",
					"  some.path.b — child b",
					"  some.path.c — child c",
				].join("\n"),
			);
		});
	});
});

describe("Structure", () => {
	describe("constructor", () => {
		it("stores fields", () => {
			const result = new Structure("schema", "process");
			assertEquals(result.schema, "schema");
			assertEquals(result.process, "process");
		});
	});

	describe("getSchema", () => {
		it("injects $schema", () => {
			const schema = { type: "string", default: "fallback" };
			const struct = new Structure(schema, () => {});
			assertEquals(
				struct.getSchema(),
				{
					$schema: "https://json-schema.org/draft/2019-09/schema",
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
		it("throws for non-strings", () => {
			const struct = Structure.string("fallback");

			const error = assertThrows(
				() => struct.process(42, { path: ["some", "path"] }),
				StructError,
			);
			assertEquals(
				error,
				new StructError("Expected a string", ["some", "path"]),
				"should throw a StructError and capture the context",
			);
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
		// TODO: I'm not sure if this should be on Structure or Configuration
		it("parses string integers", () => {
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
				StructError,
			);
			assertEquals(
				error,
				new StructError("Expected a number", ["some", "path"]),
				"should throw a StructError and capture the context",
			);
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
				StructError,
			);
			assertEquals(
				error,
				new StructError("Expected a boolean", ["some", "path"]),
				"should throw a StructError and capture the context",
			);
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
		it("throws for non-strings", () => {
			const struct = Structure.url("https://fallback.example.com");

			const error = assertThrows(
				() => struct.process(42, { path: ["some", "path"] }),
				StructError,
			);
			assertEquals(
				error,
				new StructError("Not a string or URL", ["some", "path"]),
				"should throw a StructError and capture the context",
			);
		});
		it("generates JSON schema", () => {
			const struct = Structure.url("https://fallback.example.com");
			assertEquals(struct.schema, {
				type: "string",
				format: "uri",
				default: "https://fallback.example.com",
			});
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
			});
		});
		it("throws for non-objects", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			const error = assertThrows(
				() => struct.process("not an object", { path: ["some", "path"] }),
				StructError,
			);
			assertEquals(
				error,
				new StructError("Not an object", ["some", "path"]),
				"should throw a StructError and capture the context",
			);
		});
		it("validates nested values", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			const result = struct.process({ key: "value" });
			assertEquals(result, { key: "value" });
		});
		it("fails on nested values", () => {
			const struct = Structure.object({
				key: Structure.string("fallback"),
			});
			const error = assertThrows(
				() => struct.process({ key: 42 }),
				StructError,
			);
			assertEquals(
				error,
				new StructError(
					"Object does not match schema",
					[],
					[new StructError("Not a string", ["key"])],
				),
				"should validate properties against their schema",
			);
		});
	});
});
