import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { ConfigurationOptions } from "./configuration.ts";
import {
	_parseBoolean,
	_parseFloat,
	_parsePrimative,
	_parseURL,
} from "./parsers.ts";

describe("_parsePrimative", () => {
	const env: any = {
		MY_VAR: "value-from-env",
	};
	const args: any = {
		"--option": "value-from-arg",
	};

	const options: ConfigurationOptions = {
		readTextFile: async () => "",
		getEnvironmentVariable: (key) => env[key],
		getCommandArgument: (key) => args[key],
		stringify: (_value) => "",
		parse(_value) {},
	};

	it("uses arguments 1st", () => {
		const result = _parsePrimative(
			options,
			{ flag: "--option", variable: "MY_VAR", fallback: "value-from-fallback" },
			"current-value",
		);
		assert.deepEqual(result, {
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

		assert.deepEqual(result, {
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
		assert.deepEqual(result, {
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
		assert.deepEqual(result, {
			source: "fallback",
			value: "value-from-fallback",
		});
	});
});

describe("_parseFloat", () => {
	it("parses strings", () => {
		assert.deepEqual(
			_parseFloat({ source: "argument", value: "12.34" }),
			12.34,
			"should parse the float from the result",
		);
	});
	it("passes numbers through", () => {
		assert.deepEqual(
			_parseFloat({ source: "fallback", value: 98.76 }),
			98.76,
			"should preserve number literals",
		);
	});
	it("throws for non-numeric strings", () => {
		assert.throws(
			() => _parseFloat({ source: "argument", value: "abcdef" }),
			TypeError,
		);
	});
});

describe("_parseBoolean", () => {
	it("parses strings", () => {
		assert.equal(_parseBoolean({ source: "argument", value: "1" }), true);
		assert.equal(_parseBoolean({ source: "argument", value: "true" }), true);
		assert.equal(_parseBoolean({ source: "argument", value: "0" }), false);
		assert.equal(_parseBoolean({ source: "argument", value: "false" }), false);
	});
	it("passes booleans through", () => {
		assert.equal(
			_parseBoolean({ source: "fallback", value: true }),
			true,
			"should preserve boolean literals",
		);
	});
	it("allows empty-string for arguments", () => {
		assert.equal(_parseBoolean({ source: "argument", value: "" }), true);
	});
});

describe("_parseURL", () => {
	it("parses strings", () => {
		assert.deepEqual(
			_parseURL({ source: "argument", value: "https://example.com" }),
			new URL("https://example.com"),
		);
	});
	it("passes URLS through", () => {
		assert.deepEqual(
			_parseURL({
				source: "fallback",
				value: new URL("https://example.com"),
			}),
			new URL("https://example.com"),
			"should preserve URL instances",
		);
	});
});
