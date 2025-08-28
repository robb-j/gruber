import { assertEquals, assertThrows, describe, it } from "./test-deps.js";
import {
	dangerouslyExpose,
	formatMarkdownTable,
	preventExtraction,
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

describe("preventExtraction", () => {
	it("stops object JSON serialisation", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assertThrows(() => JSON.stringify(result), TypeError);
	});
	it("stops nested object JSON serialisation", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			pet: { name: "Hugo" },
		});
		assertThrows(() => JSON.stringify(result), TypeError);
		assertThrows(() => JSON.stringify(result.pet), TypeError);
	});
	it("stops nested arrays object JSON serialisation", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			pets: [{ name: "Hugo" }, { name: "Helga" }],
		});
		assertThrows(() => JSON.stringify(result.pets), TypeError);
		assertThrows(() => JSON.stringify(result.pets[0]), TypeError);
		assertThrows(() => JSON.stringify(result.pets[1]), TypeError);
	});
	it("seals objects", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assertEquals(Object.isSealed(result), true, "should be sealed");

		assertThrows(() => {
			result.pet = "Hugo";
		}, TypeError);
	});
	it("freezes objects", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assertEquals(Object.isFrozen(result), true, "should be frozen");
	});

	it("stops arrays JSON serialisation", () => {
		const result = preventExtraction([
			{ name: "Geoff Testington" },
			{ name: "Jess Smith" },
			{ name: "Tyler Rockwell" },
		]);
		assertThrows(() => JSON.stringify(result), TypeError);
	});
	it("stops array item JSON serialisation", () => {
		const result = preventExtraction([
			{ name: "Geoff Testington" },
			{ name: "Jess Smith" },
			{ name: "Tyler Rockwell" },
		]);
		assertThrows(() => JSON.stringify(result[0]), TypeError);
		assertThrows(() => JSON.stringify(result[1]), TypeError);
		assertThrows(() => JSON.stringify(result[2]), TypeError);
	});
	it("seals arrays", () => {
		const result = preventExtraction([
			{ name: "Geoff Testington" },
			{ name: "Jess Smith" },
			{ name: "Tyler Rockwell" },
		]);
		assertEquals(Object.isSealed(result), true, "should be sealed");

		assertThrows(() => {
			result.push({ name: "Timmy" });
		}, TypeError);
	});
	it("freezes arrays", () => {
		const result = preventExtraction([
			{ name: "Geoff Testington" },
			{ name: "Jess Smith" },
			{ name: "Tyler Rockwell" },
		]);
		assertEquals(Object.isFrozen(result), true, "should be frozen");
	});
	it("allows cloned objects", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assertEquals(
			JSON.stringify(structuredClone(result)),
			'{"name":"Geoff Testington","age":42}',
		);
	});
	it("overrides the string tag", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assertEquals(result.toString(), "[object redacted]");
	});
});

describe("dangerouslyExpose", () => {
	it("allows values to be exposed", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assertEquals(
			JSON.stringify(dangerouslyExpose(result)),
			'{"name":"Geoff Testington","age":42}',
		);
	});
});
