import { assertEquals, describe, it } from "./test-deps.js";
import {
	formatMarkdownTable,
	reconstructTemplateString,
	trimIndentation,
} from "./utilities.ts";

const expected = `
| name    | type   | argument   | variable | fallback              |
| ------- | ------ | ---------- | -------- | --------------------- |
| env     | string | ~          | NODE_ENV | development           |
| selfUrl | url    | --self-url | ~        | http://localhost:3000 |
`.trim();

describe("formatMarkdownTable", () => {
	it("returns a table", () => {
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

describe("trimIndentation", () => {
	it("trims a line", () => {
		const result = trimIndentation(`
			Hello there	
		`);

		assertEquals(result, "Hello there");
	});
	it("trims two lines", () => {
		const result = trimIndentation(`
			Hello there
			General Kenobi
		`);

		assertEquals(result, "Hello there\nGeneral Kenobi");
	});
	it("keeps relative indentation", () => {
		const result = trimIndentation(`
			Hello there
				General Kenobi
		`);
		assertEquals(result, "Hello there\n	General Kenobi");
	});
	it("preserves empty lines", () => {
		const result = trimIndentation(`
			Hello there

			General Kenobi
		`);
		assertEquals(result, "Hello there\n\nGeneral Kenobi");
	});
	it("trims spaces too", () => {
		const result = trimIndentation(`
      Hello there
        General Kenobi
    `);
		assertEquals(result, "Hello there\n  General Kenobi");
	});
	it("trims with variables", () => {
		const result = trimIndentation`
			Hello there
			${"General Kenobi"}
		`;
		assertEquals(result, "Hello there\nGeneral Kenobi");
	});
});

describe("reconstructTemplateString", () => {
	it("rejoins strings with arguments", () => {
		const result = reconstructTemplateString`Hello ${"there"}!`;
		assertEquals(result, "Hello there!");
	});
});
