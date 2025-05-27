import { describe, it, assertEquals } from "../core/test-deps.js";
import { PromiseList } from "../core/utilities.ts";
import { _nestContext } from "./struct-context.ts";

describe("_nestContext", () => {
	it("appends the path", () => {
		const result = _nestContext(
			{ type: "sync", path: ["some", "path"] },
			"new_child",
		);

		assertEquals(result.path, ["some", "path", "new_child"]);
	});
	it("preserves sync", () => {
		const result = _nestContext(
			{ type: "sync", path: ["some", "path"] },
			"new_child",
		);

		assertEquals(result.type, "sync");
	});
	it("preserves async", () => {
		const promises = new PromiseList();

		const result = _nestContext(
			{ type: "async", path: ["some", "path"], promises },
			"new_child",
		);

		assertEquals(result.type, "async");
		assertEquals(result.promises, promises);
	});
});
