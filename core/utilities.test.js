import { formatMarkdownTable } from "./utilities.js";
import { assertEquals } from "./test-deps.js";

const expected = `
| name    | type   | argument   | variable | fallback              |
| ======= | ====== | ========== | ======== | ===================== |
| env     | string | ~          | NODE_ENV | development           |
| selfUrl | url    | --self-url | ~        | http://localhost:3000 |
`.trim();

Deno.test("formatMarkdownTable", async ({ step }) => {
	await step("returns a table", () => {
		const result = formatMarkdownTable(
			[
				{
					name: "env",
					type: "string",
					variable: "NODE_ENV",
					fallback: "development",
				},
				{
					name: "selfUrl",
					type: "url",
					argument: "--self-url",
					variable: "~",
					fallback: "http://localhost:3000",
				},
			],
			["name", "type", "argument", "variable", "fallback"],
			"~",
		);
		assertEquals(result, expected);
	});
});
