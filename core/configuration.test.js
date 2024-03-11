import { Configuration } from "./configuration.js";
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

		it("stores the spec", () => {
			const result = config.object({});
			assertEquals(result[Configuration.spec].type, "object");
			assertEquals(result[Configuration.spec].value, {});
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
		it("stores the spec", () => {
			const result = config.string({
				variable: "SOME_VAR",
				fallback: "value",
			});
			assertEquals(result[Configuration.spec].type, "string");
			assertEquals(result[Configuration.spec].value, {
				variable: "SOME_VAR",
				fallback: "value",
			});
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
		it("stores the spec", () => {
			const result = config.url({
				variable: "SOME_VAR",
				fallback: "https://example.com",
			});
			assertEquals(result[Configuration.spec].type, "url");
			assertEquals(result[Configuration.spec].value, {
				variable: "SOME_VAR",
				fallback: "https://example.com",
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
			assertEquals(result, "value-from-arg");
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
			assertEquals(result, "value-from-env");
		});
		it("uses the fallback", () => {
			const config = new Configuration(bareOptions);
			const result = config._getValue({ fallback: "value-from-fallback" });
			assertEquals(result, "value-from-fallback");
		});
	});

	describe("load", () => {
		const files = {
			"config.json":
				'{"env":"production","meta":{"version":"1.2.3"},"selfUrl":"https://example.com"}',
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
	});

	describe("describeSpecification", () => {
		it("processes strings", () => {
			const config = new Configuration(bareOptions);
			const result = config.describeSpecification(
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
			const result = config.describeSpecification(
				config.url({
					fallback: "https://example.com",
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
					fallback: "https://example.com",
					variable: "SELF_URL",
					flag: "--self-url",
				},
			]);
		});

		it("processes objects", () => {
			const config = new Configuration(bareOptions);
			const result = config.describeSpecification(
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
