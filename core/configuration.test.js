import { Configuration } from "./configuration.ts";
import { Structure } from "./structures.ts";
import { assertEquals, assertThrows, describe, it } from "./test-deps.js";

/** @type {import("./configuration.js").ConfigurationOptions} */
const bareOptions = {
	readTextFile() {},
	getEnvironmentVariable(_key) {},
	getCommandArgument(_key) {},
	stringify(_value) {},
	parse(_value) {},
};

describe("Configuration", () => {
	describe("constructor", () => {
		it("validates options", () => {
			new Configuration({
				readTextFile() {},
				getEnvironmentVariable(_key) {},
				getCommandArgument(_key) {},
				stringify(_value) {},
				parse(_value) {},
			});
		});
	});

	describe("object", () => {
		const config = new Configuration(bareOptions);

		it("stores the options", () => {
			const name = new Structure({}, () => {});
			const result = config.object({ name });

			assertEquals(result[Configuration.spec].options, { name });
		});
		it("describes itself", () => {
			const spec = config.object({
				fullName: config.string({ variable: "FULL_NAME", fallback: "Geoff T" }),
				age: config.number({ flag: "--age", fallback: 42 }),
			});

			const result = spec[Configuration.spec].describe("person");

			assertEquals(result, {
				fallback: { fullName: "Geoff T", age: 42 },
				fields: [
					{
						name: "person.fullName",
						type: "string",
						variable: "FULL_NAME",
						fallback: "Geoff T",
					},
					{
						name: "person.age",
						type: "number",
						flag: "--age",
						fallback: "42",
					},
				],
			});
		});
		it("ignores non-Configuration", () => {
			const spec = config.object({
				fullName: config.string({ variable: "FULL_NAME", fallback: "Geoff T" }),
				pet: Structure.string(),
			});

			const result = spec[Configuration.spec].describe("person");

			assertEquals(result, {
				fallback: { fullName: "Geoff T" },
				fields: [
					{
						name: "person.fullName",
						type: "string",
						variable: "FULL_NAME",
						fallback: "Geoff T",
					},
				],
			});
		});
	});

	describe("array", () => {
		const config = new Configuration(bareOptions);

		it("stores the options", () => {
			const name = new Structure({}, () => {});
			const result = config.array(name);

			assertEquals(result[Configuration.spec].options, name);
		});
		it("describes literals", () => {
			const spec = config.array(
				config.string({ variable: "FULL_NAME", fallback: "Geoff T" }),
			);

			const result = spec[Configuration.spec].describe("names");

			assertEquals(result, {
				fallback: [],
				fields: [
					{
						name: "names[]",
						type: "string",
						variable: "FULL_NAME",
						fallback: "Geoff T",
					},
				],
			});
		});
		it("describes objects", () => {
			const spec = config.array(
				config.object({
					name: config.string({ variable: "FULL_NAME", fallback: "Geoff T" }),
					age: config.number({ flag: "--age", fallback: 42 }),
				}),
			);

			const result = spec[Configuration.spec].describe("people");

			assertEquals(result, {
				fallback: [],
				fields: [
					{
						name: "people[].name",
						type: "string",
						variable: "FULL_NAME",
						fallback: "Geoff T",
					},
					{
						name: "people[].age",
						type: "number",
						flag: "--age",
						fallback: "42",
					},
				],
			});
		});
		it("ignores non-specified", () => {
			const spec = config.array(new Structure({}, () => {}));

			const result = spec[Configuration.spec].describe("names");

			assertEquals(result, {
				fallback: [],
				fields: [],
			});
		});
	});

	describe("string", () => {
		const config = new Configuration(bareOptions);

		it("requires a fallback", () => {
			assertThrows(() => config.string({}), TypeError);
		});
		it("uses the fallback", () => {
			const struct = config.string({ fallback: "Geoff Testington" });
			const result = struct.process(undefined);
			assertEquals(result, "Geoff Testington");
		});
		it("stores the options", () => {
			const result = config.string({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: "value",
			});
			assertEquals(result[Configuration.spec].type, "string");
			assertEquals(result[Configuration.spec].options, {
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: "value",
			});
		});
		it("describes itself", () => {
			const spec = config.string({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: "value",
			});
			const result = spec[Configuration.spec].describe("fullName");
			assertEquals(result, {
				fallback: "value",
				fields: [
					{
						name: "fullName",
						type: "string",
						variable: "SOME_VAR",
						flag: "--some-flag",
						fallback: "value",
					},
				],
			});
		});
	});

	describe("number", () => {
		const config = new Configuration(bareOptions);

		it("requires a fallback", () => {
			assertThrows(() => config.number({}), TypeError);
		});
		it("uses the fallback", () => {
			const struct = config.number({ fallback: 42 });
			const result = struct.process(undefined);
			assertEquals(result, 42);
		});
		it("stores the options", () => {
			const result = config.number({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: 42,
			});
			assertEquals(result[Configuration.spec].type, "number");
			assertEquals(result[Configuration.spec].options, {
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: 42,
			});
		});
		it("parses strings", () => {
			const vars = { SOME_VAR: "12.34" };
			const config = new Configuration({
				...bareOptions,
				getEnvironmentVariable: (key) => vars[key],
			});

			const result = config.number({
				variable: "SOME_VAR",
				fallback: 42,
			});

			assertEquals(result.process(undefined), 12.34);
		});
	});

	describe("boolean", () => {
		const config = new Configuration(bareOptions);

		it("requires a fallback", () => {
			assertThrows(() => config.boolean({}), TypeError);
		});
		it("uses the fallback", () => {
			const struct = config.boolean({ fallback: false });
			const result = struct.process(undefined);
			assertEquals(result, false);
		});
		it("stores the options", () => {
			const result = config.boolean({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: false,
			});
			assertEquals(result[Configuration.spec].type, "boolean");
			assertEquals(result[Configuration.spec].options, {
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: false,
			});
		});
		it("parses strings", () => {
			const vars = { SOME_VAR: "true" };
			const config = new Configuration({
				...bareOptions,
				getEnvironmentVariable: (key) => vars[key],
			});

			const result = config.boolean({
				variable: "SOME_VAR",
				fallback: false,
			});

			assertEquals(result.process(undefined), true);
		});
	});

	describe("url", () => {
		const config = new Configuration(bareOptions);

		it("requires a fallback", () => {
			assertThrows(() => config.url({}), TypeError);
		});
		it("converts to URL", () => {
			const struct = config.url({ fallback: "https://fallback.example.com" });
			const result = struct.process("https://example.com");
			assertEquals(result, new URL("https://example.com"));
		});
		it("uses the fallback", () => {
			const struct = config.url({ fallback: "https://fallback.example.com" });
			const result = struct.process(undefined);
			assertEquals(result, new URL("https://fallback.example.com"));
		});
		it("stores the options", () => {
			const result = config.url({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: "https://example.com",
			});
			assertEquals(result[Configuration.spec].type, "url");
			assertEquals(result[Configuration.spec].options, {
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: new URL("https://example.com"),
			});
		});
	});

	describe("_getValue", () => {
		it("uses arguments", () => {
			const args = { "--option": "value-from-arg" };
			const config = new Configuration({
				...bareOptions,
				getCommandArgument: (key) => args[key],
			});
			const result = config._getValue({
				flag: "--option",
			});
			assertEquals(result, {
				source: "argument",
				value: "value-from-arg",
			});
		});
		it("uses environment variables", () => {
			const env = { MY_VAR: "value-from-env" };
			const config = new Configuration({
				...bareOptions,
				getEnvironmentVariable: (key) => env[key],
			});
			const result = config._getValue({
				variable: "MY_VAR",
			});
			assertEquals(result, {
				source: "variable",
				value: "value-from-env",
			});
		});
		it("uses the fallback", () => {
			const config = new Configuration(bareOptions);
			const result = config._getValue({ fallback: "value-from-fallback" });
			assertEquals(result, {
				source: "fallback",
				value: "value-from-fallback",
			});
		});
	});

	describe("_parseFloat", () => {
		it("parses strings", () => {
			const config = new Configuration(bareOptions);
			assertEquals(
				config._parseFloat({ source: "argument", value: "12.34" }),
				12.34,
				"should parse the float from the result",
			);
		});
		it("passes numbers through", () => {
			const config = new Configuration(bareOptions);
			assertEquals(
				config._parseFloat({ source: "fallback", value: 98.76 }),
				98.76,
				"should preserve number literals",
			);
		});
	});

	describe("_parseBoolean", () => {
		it("parses strings", () => {
			const config = new Configuration(bareOptions);
			assertEquals(
				config._parseBoolean({ source: "argument", value: "1" }),
				true,
			);
			assertEquals(
				config._parseBoolean({ source: "argument", value: "true" }),
				true,
			);
			assertEquals(
				config._parseBoolean({ source: "argument", value: "0" }),
				false,
			);
			assertEquals(
				config._parseBoolean({ source: "argument", value: "false" }),
				false,
			);
		});
		it("passes booleans through", () => {
			const config = new Configuration(bareOptions);
			assertEquals(
				config._parseBoolean({ source: "fallback", value: true }),
				true,
				"should preserve boolean literals",
			);
		});
		it("allows empty-string for arguments", () => {
			const config = new Configuration(bareOptions);
			assertEquals(
				config._parseBoolean({ source: "argument", value: "" }),
				true,
			);
		});
	});

	describe("load", () => {
		const files = {
			"config.json":
				'{"env":"production","meta":{"version":"1.2.3"},"selfUrl":"https://example.com"}',
			"config2.json": '{"$schema":"https://example.com/schema.json"}',
		};

		const config = new Configuration({
			...bareOptions,
			readTextFile: (url) => files[url],
			parse: (v) => JSON.parse(v),
		});

		const spec = config.object({
			env: config.string({ fallback: "development" }),
			meta: config.object({
				version: config.string({ fallback: "0.0.0" }),
			}),
			selfUrl: config.url({ fallback: "http://localhost" }),
		});

		it("loads config", async () => {
			const result = await config.load("config.json", spec);
			assertEquals(result, {
				env: "production",
				meta: { version: "1.2.3" },
				selfUrl: new URL("https://example.com"),
			});
		});

		it("uses the fallback", async () => {
			const result = await config.load("missing-config.json", spec);
			assertEquals(result, {
				env: "development",
				meta: { version: "0.0.0" },
				selfUrl: new URL("http://localhost"),
			});
		});

		it("ignores $schema", async () => {
			await config.load("config2.json", spec);
		});
	});

	describe("describe", () => {
		it("processes strings", () => {
			const config = new Configuration(bareOptions);
			const result = config.describe(
				config.string({
					fallback: "test-app",
					variable: "APP_NAME",
					flag: "--app-name",
				}),
				"appName",
			);
			assertEquals(result.fallback, "test-app");
			assertEquals(result.fields, [
				{
					name: "appName",
					type: "string",
					fallback: "test-app",
					variable: "APP_NAME",
					flag: "--app-name",
				},
			]);
		});

		it("processes urls", () => {
			const config = new Configuration(bareOptions);
			const result = config.describe(
				config.url({
					fallback: "https://example.com/",
					variable: "SELF_URL",
					flag: "--self-url",
				}),
				"selfUrl",
			);
			assertEquals(result.fallback, new URL("https://example.com"));
			assertEquals(result.fields, [
				{
					name: "selfUrl",
					type: "url",
					fallback: "https://example.com/",
					variable: "SELF_URL",
					flag: "--self-url",
				},
			]);
		});

		it("processes objects", () => {
			const config = new Configuration(bareOptions);
			const result = config.describe(
				config.object({
					name: config.string({
						fallback: "testing-app",
						variable: "APP_NAME",
						flag: "--app-name",
					}),
				}),
				"meta",
			);
			assertEquals(result.fallback, { name: "testing-app" });
			assertEquals(result.fields, [
				{
					name: "meta.name",
					type: "string",
					fallback: "testing-app",
					variable: "APP_NAME",
					flag: "--app-name",
				},
			]);
		});
	});
});
