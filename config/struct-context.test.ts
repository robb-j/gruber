import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { PromiseList } from "../core/utilities.ts";
import { _nestContext } from "./struct-context.ts";

describe("_nestContext", () => {
	it("appends the path", () => {
		const result = _nestContext(
			{ type: "sync", path: ["some", "path"] },
			"new_child",
		);

		assert.deepEqual(result.path, ["some", "path", "new_child"]);
	});
	it("preserves sync", () => {
		const result = _nestContext(
			{ type: "sync", path: ["some", "path"] },
			"new_child",
		);

		assert.equal(result.type, "sync");
	});
	it("preserves async", () => {
		const promises = new PromiseList();

		const result = _nestContext(
			{ type: "async", path: ["some", "path"], promises },
			"new_child",
		);

		assert.equal(result.type, "async");
		assert.deepEqual(result.promises, promises);
	});
});
