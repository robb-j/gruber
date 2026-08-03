import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	dangerouslyExpose,
	formatMarkdownTable,
	getOrInsert,
	pickProperties,
	preventExtraction,
	reconstructTemplateString,
	trimIndentation,
} from "./utilities.ts";

const expectedMarkdownTable = `
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
		assert.equal(result, expectedMarkdownTable);
	});
});

describe("trimIndentation", () => {
	it("trims a line", () => {
		const result = trimIndentation(`
			Hello there	
		`);

		assert.equal(result, "Hello there");
	});
	it("trims two lines", () => {
		const result = trimIndentation(`
			Hello there
			General Kenobi
		`);

		assert.equal(result, "Hello there\nGeneral Kenobi");
	});
	it("keeps relative indentation", () => {
		const result = trimIndentation(`
			Hello there
				General Kenobi
		`);
		assert.equal(result, "Hello there\n	General Kenobi");
	});
	it("preserves empty lines", () => {
		const result = trimIndentation(`
			Hello there

			General Kenobi
		`);
		assert.equal(result, "Hello there\n\nGeneral Kenobi");
	});
	it("trims spaces too", () => {
		const result = trimIndentation(`
      Hello there
        General Kenobi
    `);
		assert.equal(result, "Hello there\n  General Kenobi");
	});
	it("trims with variables", () => {
		const result = trimIndentation`
			Hello there
			${"General Kenobi"}
		`;
		assert.equal(result, "Hello there\nGeneral Kenobi");
	});
});

describe("reconstructTemplateString", () => {
	it("rejoins strings with arguments", () => {
		const result = reconstructTemplateString`Hello ${"there"}!`;
		assert.equal(result, "Hello there!");
	});
});

describe("preventExtraction", () => {
	it("stops object JSON serialisation", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assert.throws(() => JSON.stringify(result), TypeError);
	});
	it("stops nested object JSON serialisation", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			pet: { name: "Hugo" },
		});
		assert.throws(() => JSON.stringify(result), TypeError);
		assert.throws(() => JSON.stringify(result.pet), TypeError);
	});
	it("stops nested arrays object JSON serialisation", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			pets: [{ name: "Hugo" }, { name: "Helga" }],
		});
		assert.throws(() => JSON.stringify(result.pets), TypeError);
		assert.throws(() => JSON.stringify(result.pets[0]), TypeError);
		assert.throws(() => JSON.stringify(result.pets[1]), TypeError);
	});
	it("seals objects", () => {
		const result: any = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assert(Object.isSealed(result), "should be sealed");

		assert.throws(() => {
			result.pet = "Hugo";
		}, TypeError);
	});
	it("freezes objects", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assert(Object.isFrozen(result), "should be frozen");
	});

	it("stops arrays JSON serialisation", () => {
		const result = preventExtraction([
			{ name: "Geoff Testington" },
			{ name: "Jess Smith" },
			{ name: "Tyler Rockwell" },
		]);
		assert.throws(() => JSON.stringify(result), TypeError);
	});
	it("stops array item JSON serialisation", () => {
		const result = preventExtraction([
			{ name: "Geoff Testington" },
			{ name: "Jess Smith" },
			{ name: "Tyler Rockwell" },
		]);
		assert.throws(() => JSON.stringify(result[0]), TypeError);
		assert.throws(() => JSON.stringify(result[1]), TypeError);
		assert.throws(() => JSON.stringify(result[2]), TypeError);
	});
	it("seals arrays", () => {
		const result = preventExtraction([
			{ name: "Geoff Testington" },
			{ name: "Jess Smith" },
			{ name: "Tyler Rockwell" },
		]);
		assert(Object.isSealed(result), "should be sealed");

		assert.throws(() => {
			result.push({ name: "Timmy" });
		}, TypeError);
	});
	it("freezes arrays", () => {
		const result = preventExtraction([
			{ name: "Geoff Testington" },
			{ name: "Jess Smith" },
			{ name: "Tyler Rockwell" },
		]);
		assert(Object.isFrozen(result), "should be frozen");
	});
	it("allows cloned objects", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assert.equal(
			JSON.stringify(structuredClone(result)),
			'{"name":"Geoff Testington","age":42}',
		);
	});
	it("overrides the string tag", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assert.equal(result.toString(), "[object redacted]");
	});
});

describe("dangerouslyExpose", () => {
	it("allows objects to be stringified", () => {
		const result = preventExtraction({
			name: "Geoff Testington",
			age: 42,
		});
		assert.equal(
			JSON.stringify(dangerouslyExpose(result)),
			'{"name":"Geoff Testington","age":42}',
		);
	});
	it("works with objects & primatives", () => {
		const input = preventExtraction({
			name: "Geoff Testington",
			age: 42,
			isCool: true,
			notSure: undefined,
		});
		const result = dangerouslyExpose(input);

		assert.notEqual(result, input, "should be a different object");
		assert.deepEqual(result, {
			name: "Geoff Testington",
			age: 42,
			isCool: true,
			notSure: undefined,
		});
	});
	it("works with arrays", () => {
		const input = preventExtraction(["Geoff Testington", "Jess Assertly"]);
		const result = dangerouslyExpose(input);

		assert(result !== input, "should be a different array");
		assert.deepEqual(result, ["Geoff Testington", "Jess Assertly"]);
	});
	it("works with sets", () => {
		const input = preventExtraction(
			new Set(["Geoff Testington", "Jess Assertly"]),
		);
		const result = dangerouslyExpose(input);

		assert(result !== input, "should be a different set");
		assert.deepEqual(result, new Set(["Geoff Testington", "Jess Assertly"]));
	});
	it("works with maps", () => {
		const input = preventExtraction(
			new Map([
				["geoff", 42],
				["jess", 64],
			]),
		);
		const result = dangerouslyExpose(input);

		assert(result !== input, "should be a different map");
		assert.deepEqual(
			result,
			new Map([
				["geoff", 42],
				["jess", 64],
			]),
		);
	});
	it("works with URLs", () => {
		const input = preventExtraction(new URL("https://duck.com"));
		const result = dangerouslyExpose(input);

		assert.deepEqual(result, new URL("https://duck.com"));
	});
	it("allows custom", () => {
		const input = preventExtraction({
			[dangerouslyExpose.custom]: () => 42,
		});
		const result = dangerouslyExpose(input);

		assert.equal(result, 42);
	});
	it("works with nested objects", () => {
		const input = preventExtraction({
			first: {
				second: {
					third: {},
				},
			},
		});
		const result = dangerouslyExpose(input);

		assert(result !== input, "should be a different object");
		assert(result.first !== input.first, "should be a different object");
		assert(
			result.first.second !== input.first.second,
			"should be a different object",
		);
		assert(
			result.first.second.third !== input.first.second.third,
			"should be a different object",
		);

		assert.deepEqual(result, {
			first: {
				second: {
					third: {},
				},
			},
		});
	});
	it("works with nested arrays", () => {
		const input = preventExtraction([[[[1, 2, 3]]]]);
		const result = dangerouslyExpose(input);

		assert(result !== input, "should be a different array");
		assert(result[0] !== input[0], "should be a different array");
		assert(result[0][0] !== input[0][0], "should be a different array");
		assert(result[0][0][0] !== input[0][0][0], "should be a different array");

		assert.deepEqual(result, [[[[1, 2, 3]]]]);
	});
});

describe("pickProperties", () => {
	it("picks properties", () => {
		assert.deepEqual(
			pickProperties(
				{
					name: "Geoff Testington",
					age: 42,
					pets: ["Hugo", "Florence"],
				},
				["name", "age"],
			),
			{ name: "Geoff Testington", age: 42 },
		);
	});
});

describe("getOrInsert", () => {
	it("returns the existing value", () => {
		const map = new Map([["the_answer", 42]]);
		assert.equal(getOrInsert(map, "the_answer", 100), 42);
	});
	it("returns sets missing values", () => {
		const map = new Map();
		assert.equal(getOrInsert(map, "the_answer", 100), 100);
	});
});
