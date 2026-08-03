import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { PromiseList } from "../core/utilities.ts";
import { Configuration, type ConfigurationOptions } from "./configuration.ts";
import { Structure } from "./structure.ts";
import type { StructContext } from "./struct-context.ts";

const stubOptions: ConfigurationOptions = {
	readTextFile: async () => "",
	getEnvironmentVariable(_key) {},
	getCommandArgument(_key) {},
	stringify: (_value) => "",
	parse(_value) {},
};

describe("Configuration", () => {
	describe("constructor", () => {
		it("validates options", () => {
			new Configuration(stubOptions);
		});
	});

	describe("_loadValue", () => {
		const files: any = {
			"config.json": '{"name":"Geoff Testington","age":42}',
			"config2.json":
				'{"name":"Geoff Testington","age":42, "$schema":"https://example.com"}',
		};
		it("reads and validates a file", async () => {
			const config = new Configuration({
				...stubOptions,
				readTextFile: (url) => files[url as string],
				parse: (v) => JSON.parse(v),
			});

			const result = await config._loadValue(
				"config.json",
				Structure.object({
					name: Structure.string(),
					age: Structure.number(),
				}),
				{ type: "sync", path: [] },
			);

			assert.deepEqual(result, {
				name: "Geoff Testington",
				age: 42,
			});
		});
		it("returns null for missing files", async () => {
			const config = new Configuration({
				...stubOptions,
				readTextFile: (url) => files[url as string],
				parse: (v) => JSON.parse(v),
			});

			const result = await config._loadValue(
				"missing.json",
				Structure.object({ name: Structure.string() }),
				{ type: "sync", path: [] },
			);

			assert.equal(result, null);
		});
		it("clears $schema", async () => {
			const config = new Configuration({
				...stubOptions,
				readTextFile: (url) => files[url as string],
				parse: (v) => JSON.parse(v),
			});

			const result = await config._loadValue(
				"config.json",
				Structure.object({
					name: Structure.string(),
					age: Structure.number(),
				}),
				{ type: "sync", path: [] },
			);

			assert.equal((result as any).$schema, undefined);
		});
	});

	describe("_primative", () => {
		const env: any = {
			USER: "geoff",
		};
		const args: any = {
			"--port": "42",
		};
		const config = new Configuration({
			...stubOptions,
			getEnvironmentVariable: (key) => env[key],
			getCommandArgument: (key) => args[key],
		});

		it("uses env vars", () => {
			const struct = config._primative(
				Structure.string(),
				{ variable: "USER", fallback: "" },
				(result) => result.value,
			);
			assert.equal(struct.process(), "geoff");
		});
		it("uses args", () => {
			const struct = config._primative(
				Structure.number(),
				{ flag: "--port", fallback: 0 },
				(result) => parseInt(result.value as any),
			);
			assert.equal(struct.process(), 42);
		});
		it("uses fallbacks", () => {
			const struct = config._primative(
				Structure.string(),
				{ fallback: "Geoff Testington" },
				(result) => result.value,
			);
			assert.equal(struct.process(), "Geoff Testington");
		});
		it("passes through the value", () => {
			const struct = config._primative(
				Structure.string(),
				{ fallback: "Geoff Testington" },
				(result) => result.value,
			);
			assert.equal(struct.process("Colin Robinson"), "Colin Robinson");
		});
	});

	describe("object", () => {
		const config = new Configuration(stubOptions);

		it("describes itself", () => {
			const spec: any = config.object({
				fullName: config.string({ variable: "FULL_NAME", fallback: "Geoff T" }),
				age: config.number({ flag: "--age", fallback: 42 }),
			});

			const result = spec[Configuration.spec]("person");

			assert.deepEqual(result, {
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
			const spec: any = config.object({
				fullName: config.string({ variable: "FULL_NAME", fallback: "Geoff T" }),
				pet: Structure.string(),
			});

			const result = spec[Configuration.spec]("person");

			assert.deepEqual(result, {
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
		const config = new Configuration(stubOptions);

		it("describes literals", () => {
			const spec: any = config.array(
				config.string({ variable: "FULL_NAME", fallback: "Geoff T" }),
			);

			const result = spec[Configuration.spec]("names");

			assert.deepEqual(result, {
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
			const spec: any = config.array(
				config.object({
					name: config.string({ variable: "FULL_NAME", fallback: "Geoff T" }),
					age: config.number({ flag: "--age", fallback: 42 }),
				}),
			);

			const result = spec[Configuration.spec]("people");

			assert.deepEqual(result, {
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
			const spec: any = config.array(new Structure({}, () => {}));

			const result = spec[Configuration.spec]("names");

			assert.deepEqual(result, {
				fallback: [],
				fields: [],
			});
		});
	});

	describe("external", () => {
		const files: any = {
			"object.json": '{"name":"Geoff Testington","age":42}',
			"array.json": '["first", "second", "third"]',
		};
		const config = new Configuration({
			...stubOptions,
			readTextFile: (path) => files[path as string],
			parse: (v) => JSON.parse(v),
		});
		it("loads queues a promise", async () => {
			const struct = config.external(
				"object.json",
				Structure.object({ name: Structure.string(), age: Structure.number() }),
			);
			const context: StructContext = {
				type: "async",
				path: [],
				promises: new PromiseList(),
			};
			struct.process(undefined, context);

			assert.equal(context.promises.length, 1);
		});
		it("loads and parses objects", async () => {
			const struct = config.external(
				"object.json",
				Structure.object({ name: Structure.string(), age: Structure.number() }),
			);
			const context: StructContext = {
				type: "async",
				path: [],
				promises: new PromiseList(),
			};
			const result = struct.process(undefined, context);

			assert.deepEqual(result, {});

			await context.promises.all();

			assert.deepEqual(result, { name: "Geoff Testington", age: 42 });
		});
		it("loads and parses arrays", async () => {
			const struct = config.external(
				"array.json",
				Structure.array(Structure.string()),
			);
			const context: StructContext = {
				type: "async",
				path: [],
				promises: new PromiseList(),
			};
			const result = struct.process(undefined, context);

			assert.deepEqual(result, []);

			await context.promises.all();

			assert.deepEqual(result, ["first", "second", "third"]);
		});
		it("fails when sync", () => {
			const struct = config.external(
				"object.json",
				Structure.object({ name: Structure.string() }),
			);
			const exec = () => struct.process(undefined, { type: "sync", path: [] });

			assert.throws(exec, Structure.Error);
		});
		it("passes through when missing", async () => {
			const struct = config.external(
				"missing.json",
				Structure.object({ name: Structure.string() }),
			);
			const context: StructContext = {
				type: "async",
				path: [],
				promises: new PromiseList(),
			};
			const result = struct.process({ name: "Colin Robinson" }, context);

			await context.promises.all();

			assert.deepEqual(result, { name: "Colin Robinson" });
		});
	});

	describe("string", () => {
		const config = new Configuration(stubOptions);

		it("requires a fallback", () => {
			assert.throws(() => config.string({} as any), TypeError);
		});
		it("uses the fallback", () => {
			const struct = config.string({ fallback: "Geoff Testington" });
			const result = struct.process(undefined);
			assert.equal(result, "Geoff Testington");
		});
		it("describes itself", () => {
			const spec: any = config.string({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: "value",
			});
			const result = spec[Configuration.spec]("fullName");
			assert.deepEqual(result, {
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
		const config = new Configuration(stubOptions);

		it("requires a fallback", () => {
			assert.throws(() => config.number({} as any), TypeError);
		});
		it("uses the fallback", () => {
			const struct = config.number({ fallback: 42 });
			const result = struct.process(undefined);
			assert.equal(result, 42);
		});
		it("parses strings", () => {
			const vars: any = { SOME_VAR: "12.34" };
			const config = new Configuration({
				...stubOptions,
				getEnvironmentVariable: (key) => vars[key],
			});

			const result = config.number({
				variable: "SOME_VAR",
				fallback: 42,
			});

			assert.equal(result.process(undefined), 12.34);
		});
		it("describes itself", () => {
			const spec: any = config.number({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: 12.34,
			});
			const result = spec[Configuration.spec]("age");
			assert.deepEqual(result, {
				fallback: 12.34,
				fields: [
					{
						name: "age",
						type: "number",
						variable: "SOME_VAR",
						flag: "--some-flag",
						fallback: "12.34",
					},
				],
			});
		});
	});

	describe("boolean", () => {
		const config = new Configuration(stubOptions);

		it("requires a fallback", () => {
			assert.throws(() => config.boolean({} as any), TypeError);
		});
		it("uses the fallback", () => {
			const struct = config.boolean({ fallback: false });
			const result = struct.process(undefined);
			assert.equal(result, false);
		});
		it("parses strings", () => {
			const vars: any = { SOME_VAR: "true" };
			const config = new Configuration({
				...stubOptions,
				getEnvironmentVariable: (key) => vars[key],
			});

			const result = config.boolean({
				variable: "SOME_VAR",
				fallback: false,
			});

			assert.equal(result.process(undefined), true);
		});
		it("describes itself", () => {
			const spec: any = config.boolean({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: false,
			});
			const result = spec[Configuration.spec]("hasPets");
			assert.deepEqual(result, {
				fallback: false,
				fields: [
					{
						name: "hasPets",
						type: "boolean",
						variable: "SOME_VAR",
						flag: "--some-flag",
						fallback: "false",
					},
				],
			});
		});
	});

	describe("url", () => {
		const config = new Configuration(stubOptions);

		it("requires a fallback", () => {
			assert.throws(() => config.url({} as any), TypeError);
		});
		it("converts to URL", () => {
			const struct = config.url({ fallback: "https://fallback.example.com" });
			const result = struct.process("https://example.com");
			assert.deepEqual(result, new URL("https://example.com"));
		});
		it("uses the fallback", () => {
			const struct = config.url({ fallback: "https://fallback.example.com" });
			const result = struct.process(undefined);
			assert.deepEqual(result, new URL("https://fallback.example.com"));
		});
		it("describes itself", () => {
			const spec: any = config.url({
				variable: "SOME_VAR",
				flag: "--some-flag",
				fallback: "https://example.com",
			});
			const result = spec[Configuration.spec]("hasPets");
			assert.deepEqual(result, {
				fallback: new URL("https://example.com"),
				fields: [
					{
						name: "hasPets",
						type: "url",
						variable: "SOME_VAR",
						flag: "--some-flag",
						fallback: "https://example.com/",
					},
				],
			});
		});
	});

	describe("_getValue", () => {});

	describe("load", () => {
		const files: any = {
			"config.json":
				'{"env":"production","meta":{"version":"1.2.3"},"selfUrl":"https://example.com"}',
			"config2.json": '{"$schema":"https://example.com/schema.json"}',
		};

		const config = new Configuration({
			...stubOptions,
			readTextFile: (url) => files[url as string],
			parse: (v) => JSON.parse(v),
		});

		const struct = config.object({
			env: config.string({ fallback: "development" }),
			meta: config.object({
				version: config.string({ fallback: "0.0.0" }),
			}),
			selfUrl: config.url({ fallback: "http://localhost" }),
		});

		it("loads config", async () => {
			const result = await config.load("config.json", struct);
			assert.deepEqual(result, {
				env: "production",
				meta: { version: "1.2.3" },
				selfUrl: new URL("https://example.com"),
			});
		});

		it("uses the fallback", async () => {
			const result = await config.load("missing-config.json", struct);
			assert.deepEqual(result, {
				env: "development",
				meta: { version: "0.0.0" },
				selfUrl: new URL("http://localhost"),
			});
		});

		it("ignores $schema", async () => {
			await config.load("config2.json", struct);
		});

		it("awaits promises", async () => {
			const asyncStruct = new Structure({}, (value, context) => {
				if (context.type !== "async") throw new Error("not async");

				let result = { awaited: false };
				context.promises.push(async () => {
					await new Promise((r) => setTimeout(r, 0));
					result.awaited = true;
				});
				return result;
			});

			const struct = Structure.object({
				field: asyncStruct,
			});

			const result = await config.load("config2.json", struct);

			assert.deepEqual(result, {
				field: { awaited: true },
			});
		});
	});

	describe("describe", () => {
		it("processes strings", () => {
			const config = new Configuration(stubOptions);
			const result = config.describe(
				config.string({
					fallback: "test-app",
					variable: "APP_NAME",
					flag: "--app-name",
				}),
				"appName",
			);
			assert.equal(result.fallback, "test-app");
			assert.deepEqual(result.fields, [
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
			const config = new Configuration(stubOptions);
			const result = config.describe(
				config.url({
					fallback: "https://example.com/",
					variable: "SELF_URL",
					flag: "--self-url",
				}),
				"selfUrl",
			);
			assert.deepEqual(result.fallback, new URL("https://example.com"));
			assert.deepEqual(result.fields, [
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
			const config = new Configuration(stubOptions);
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
			assert.deepEqual(result.fallback, { name: "testing-app" });
			assert.deepEqual(result.fields, [
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
