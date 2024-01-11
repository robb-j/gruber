import { Configuration } from "./configuration.js";
import { assertEquals, assertThrows } from "./test-deps.js";
import { superstruct } from "./test-deps.js";

/** @type {import("./configuration.js").ConfigurationOptions} */
const bareOptions = {
	superstruct,
	readTextFile() {},
	getEnvironmentVariable(_key) {},
	getCommandArgument(_key) {},
	stringify(_value) {},
	parse(_value) {},
};

Deno.test("Configuration", async ({ step }) => {
	await step("constructor", async ({ step }) => {
		await step("validates options", () => {
			new Configuration({
				superstruct,
				readTextFile() {},
				getEnvironmentVariable(_key) {},
				getCommandArgument(_key) {},
				stringify(_value) {},
				parse(_value) {},
			});
		});
	});

	await step("object", async ({ step }) => {
		const config = new Configuration(bareOptions);

		await step("stores spec", () => {
			const result = config.object({});
			assertEquals(result[Configuration.spec].type, "object");
			assertEquals(result[Configuration.spec].value, {});
		});
	});

	await step("string", async ({ step }) => {
		const config = new Configuration(bareOptions);

		await step("requires a fallback", () => {
			assertThrows(() => config.string({}), TypeError);
		});

		await step("uses the fallback", () => {
			const struct = config.string({ fallback: "Geoff Testington" });
			const result = superstruct.create(undefined, struct);
			assertEquals(result, "Geoff Testington");
		});

		await step("stores spec", () => {
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

	await step("url", async ({ step }) => {
		const config = new Configuration(bareOptions);

		await step("requires a fallback", () => {
			assertThrows(() => config.url({}), TypeError);
		});

		await step("converts to URL", () => {
			const struct = config.url({ fallback: "" });
			const result = superstruct.create("https://example.com", struct);
			assertEquals(result, new URL("https://example.com"));
		});

		await step("uses the fallback", () => {
			const struct = config.url({ fallback: "https://example.com" });
			const result = superstruct.create(undefined, struct);
			assertEquals(result, new URL("https://example.com"));
		});

		await step("stores spec", () => {
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

	await step("_getValue", async ({ step }) => {
		await step("uses arguments", () => {
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

		await step("uses environment variables", () => {
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

		await step("uses the fallback", () => {
			const config = new Configuration(bareOptions);
			const result = config._getValue({ fallback: "value-from-fallback" });
			assertEquals(result, "value-from-fallback");
		});
	});

	await step("load", async ({ step }) => {
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

		await step("loads config", async () => {
			const result = await config.load("config.json", spec);
			assertEquals(result, {
				env: "production",
				meta: { version: "1.2.3" },
				selfUrl: new URL("https://example.com"),
			});
		});

		await step("uses the fallback", async () => {
			const result = await config.load("missing-config.json", spec);
			assertEquals(result, {
				env: "development",
				meta: { version: "0.0.0" },
				selfUrl: new URL("http://localhost"),
			});
		});
	});

	await step("describeSpecification", async ({ step }) => {
		await step("processes strings", () => {
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
					fallback: "test-app",
					variable: "APP_NAME",
					flag: "--app-name",
				},
			]);
		});

		await step("processes urls", () => {
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
					fallback: "https://example.com",
					variable: "SELF_URL",
					flag: "--self-url",
				},
			]);
		});

		await step("processes objects", () => {
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
					fallback: "testing-app",
					variable: "APP_NAME",
					flag: "--app-name",
				},
			]);
		});
	});
});
