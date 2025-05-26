import { assertEquals, describe, it } from "../core/test-deps.js";
import {
	_parseBoolean,
	_parseFloat,
	_parseURL,
	_parsePrimative,
} from "./parsers.ts";

describe("_parsePrimative", () => {
	const env = {
		MY_VAR: "value-from-env",
	};
	const args = {
		"--option": "value-from-arg",
	};

	/** @type {import("./configuration.ts").ConfigurationOptions} */
	const options = {
		readTextFile() {},
		getEnvironmentVariable: (key) => env[key],
		getCommandArgument: (key) => args[key],
		stringify(_value) {},
		parse(_value) {},
	};

	it("uses arguments 1st", () => {
		const result = _parsePrimative(
			options,
			{ flag: "--option", variable: "MY_VAR", fallback: "value-from-fallback" },
			"current-value",
		);
		assertEquals(result, {
			source: "argument",
			value: "value-from-arg",
		});
	});
	it("uses environment variables 2nd", () => {
		const result = _parsePrimative(
			options,
			{ variable: "MY_VAR", fallback: "value-from-fallback" },
			"current-value",
		);

		assertEquals(result, {
			source: "variable",
			value: "value-from-env",
		});
	});
	it("uses the currentValue 3d", () => {
		const result = _parsePrimative(
			options,
			{ fallback: "value-from-fallback" },
			"current-value",
		);
		assertEquals(result, {
			source: "current",
			value: "current-value",
		});
	});
	it("uses the fallback last", () => {
		const result = _parsePrimative(
			options,
			{ fallback: "value-from-fallback" },
			undefined,
		);
		assertEquals(result, {
			source: "fallback",
			value: "value-from-fallback",
		});
	});
});

describe("_parseFloat", () => {
	it("parses strings", () => {
		assertEquals(
			_parseFloat({ source: "argument", value: "12.34" }),
			12.34,
			"should parse the float from the result",
		);
	});
	it("passes numbers through", () => {
		assertEquals(
			_parseFloat({ source: "fallback", value: 98.76 }),
			98.76,
			"should preserve number literals",
		);
	});
});

describe("_parseBoolean", () => {
	it("parses strings", () => {
		assertEquals(_parseBoolean({ source: "argument", value: "1" }), true);
		assertEquals(_parseBoolean({ source: "argument", value: "true" }), true);
		assertEquals(_parseBoolean({ source: "argument", value: "0" }), false);
		assertEquals(_parseBoolean({ source: "argument", value: "false" }), false);
	});
	it("passes booleans through", () => {
		assertEquals(
			_parseBoolean({ source: "fallback", value: true }),
			true,
			"should preserve boolean literals",
		);
	});
	it("allows empty-string for arguments", () => {
		assertEquals(_parseBoolean({ source: "argument", value: "" }), true);
	});
});

describe("_parseURL", () => {
	it("parses strings", () => {
		assertEquals(
			_parseURL({ source: "argument", value: "https://example.com" }),
			new URL("https://example.com"),
		);
	});
	it("passes URLS through", () => {
		assertEquals(
			_parseURL({
				source: "fallback",
				value: new URL("https://example.com"),
			}),
			new URL("https://example.com"),
			"should preserve URL instances",
		);
	});
});
