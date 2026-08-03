import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { _StructError } from "./mod.ts";

describe("Structure.Error", () => {
	describe("constructor", () => {
		it("stores values", () => {
			const err = new _StructError("error message", ["some", "path"]);
			assert.deepEqual(err.path, ["some", "path"]);
			assert.equal(err.message, "error message");
			assert.equal(err.name, "Structure.Error");
		});
		it("stores children", () => {
			const child = new _StructError("child message", ["path"]);
			const parent = new _StructError("parent message", ["path"], [child]);
			assert.deepEqual(parent.children, [child]);
		});
	});

	describe("chain", () => {
		it("returns StructErrors", () => {
			const ctx = { path: ["some", "path"] };
			const result = _StructError.chain(
				new _StructError("error message", ["another", "path"]),
				ctx,
			);
			assert(result instanceof _StructError);
			assert.deepEqual(
				result.path,
				["another", "path"],
				"returns the StructError without modifying the path",
			);
		});
		it("wraps Errors", () => {
			const ctx = { path: ["some", "path"] };
			const result = _StructError.chain(new Error("error message"), ctx);
			assert(result instanceof _StructError);
			assert.deepEqual(result.path, ["some", "path"]);
		});
		it("wraps non-Errors", () => {
			const ctx = { path: ["some", "path"] };
			const result = _StructError.chain("unknown", ctx);
			assert(result instanceof _StructError, "creates a generic StructError");
			assert.deepEqual(result.path, ["some", "path"]);
		});
	});

	describe("getOneLiner", () => {
		it("formats the error", () => {
			const error = new _StructError("error message", ["some", "path"]);
			assert.equal(error.getOneLiner(), "some.path — error message");
		});
	});

	describe("[Symbol.iterator]", () => {
		it("yields children", () => {
			const error = new _StructError(
				"error message",
				["some", "path"],
				[
					new _StructError("child a"),
					new _StructError("child b"),
					new _StructError("child c"),
				],
			);
			assert.deepEqual(
				Array.from(error, (i) => i.message),
				["child a", "child b", "child c"],
				"should yield each child",
			);
		});
		it("yields nested children", () => {
			const error = new _StructError(
				"parent a",
				["some"],
				[
					new _StructError(
						"parent b",
						["path"],
						[
							new _StructError("child a"),
							new _StructError("child b"),
							new _StructError("child c"),
						],
					),
				],
			);
			assert.deepEqual(
				Array.from(error, (i) => i.message),
				["child a", "child b", "child c"],
				"should yield all nested children which have no children of their own",
			);
		});
	});

	describe("toFriendlyString", () => {
		it("formats a message", () => {
			const error = new _StructError(
				"parent message",
				["some", "path"],
				[
					new _StructError("child a", ["some", "path", "a"]),
					new _StructError("child b", ["some", "path", "b"]),
					new _StructError("child c", ["some", "path", "c"]),
				],
			);

			assert.deepEqual(
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
