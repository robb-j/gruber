import { Configuration } from "./configuration.js";
import { assert, assertEquals } from "./test-deps.js";

Deno.test("Configuration", async ({ step }) => {
	await step("constructor", () => {
		const config = new Configuration();
		// ...
	});
});
