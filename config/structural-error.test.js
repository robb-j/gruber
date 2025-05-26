import { assertEquals, describe, it } from "../core/test-deps.js";
import { StructuralError } from "./mod.ts";

describe("StructuralError", () => {
	describe("constructor", () => {
		it("stores values", () => {
			const err = new StructuralError("error message", "some.path");
			assertEquals(err.path, "some.path");
			assertEquals(err.message, "error message");
			assertEquals(err.name, "StructuralError");
		});
		it("stores children", () => {
			const child = new StructuralError("child message", "path");
			const parent = new StructuralError("parent message", "path", [child]);
			assertEquals(parent.children, [child]);
		});
	});

	describe("chain", () => {
		it("returns StructuralErrors", () => {
			const ctx = { path: ["some", "path"] };
			const result = StructuralError.chain(
				new StructuralError("error message", ["another", "path"]),
				ctx,
			);
			assertEquals(
				result,
				new StructuralError("error message", ["another", "path"]),
				"returns the StructuralError without modifying the path",
			);
		});
		it("wraps Errors", () => {
			const ctx = { path: ["some", "path"] };
			const result = StructuralError.chain(new Error("error message"), ctx);
			assertEquals(
				result,
				new StructuralError("error message", ["some", "path"]),
				"creates a StructuralError and sets the path from the context",
			);
		});
		it("wraps non-Errors", () => {
			const ctx = { path: ["some", "path"] };
			const result = StructuralError.chain("unknown", ctx);
			assertEquals(
				result,
				new StructuralError("Unknown error", ["some", "path"]),
				"creates a generic StructuralError",
			);
		});
	});

	describe("getOneLiner", () => {
		it("formats the error", () => {
			const error = new StructuralError("error message", ["some", "path"]);
			assertEquals(error.getOneLiner(), "some.path — error message");
		});
	});

	describe("[Symbol.iterator]", () => {
		it("yields children", () => {
			const error = new StructuralError(
				"error message",
				["some", "path"],
				[
					new StructuralError("child a"),
					new StructuralError("child b"),
					new StructuralError("child c"),
				],
			);
			assertEquals(
				Array.from(error, (i) => i.message),
				["child a", "child b", "child c"],
				"should yield each child",
			);
		});
		it("yields nested children", () => {
			const error = new StructuralError(
				"parent a",
				["some"],
				[
					new StructuralError(
						"parent b",
						["path"],
						[
							new StructuralError("child a"),
							new StructuralError("child b"),
							new StructuralError("child c"),
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
			const error = new StructuralError(
				"parent message",
				["some", "path"],
				[
					new StructuralError("child a", ["some", "path", "a"]),
					new StructuralError("child b", ["some", "path", "b"]),
					new StructuralError("child c", ["some", "path", "c"]),
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
