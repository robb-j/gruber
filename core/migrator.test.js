import { Migrator, defineMigration } from "./migrator.js";
import { assertEquals } from "./test-deps.js";

const bareOptions = {
	getDefinitions: () => [],
	getRecords: () => [],
	executeUp() {},
	executeDown() {},
};

Deno.test("defineMigration", async ({ step }) => {
	await step("formats the options", () => {
		const result = defineMigration({
			up() {},
			down() {},
		});
		assertEquals(result, {
			up: result.up,
			down: result.down,
		});
	});
});

Deno.test("Migrator", async ({ step }) => {
	await step("_getTodo", async ({ step }) => {
		await step("gets pending", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () => [{ name: "a" }, { name: "b" }, { name: "c" }],
			});

			const result = await migrator._getTodo("up", -1);
			assertEquals(result, [{ name: "a" }, { name: "b" }, { name: "c" }]);
		});
		await step("gets executed", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () => [{ name: "a" }, { name: "b" }, { name: "c" }],
				getRecords: () => [{ name: "a" }, { name: "b" }, { name: "c" }],
			});

			const result = await migrator._getTodo("down", -1);
			assertEquals(result, [{ name: "c" }, { name: "b" }, { name: "a" }]);
		});
		await step("skips previous", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () => [{ name: "a" }, { name: "b" }, { name: "c" }],
				getRecords: () => [{ name: "a" }],
			});

			const result = await migrator._getTodo("up", -1);
			assertEquals(result, [{ name: "b" }, { name: "c" }]);
		});
		await step("limits up", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () => [{ name: "a" }, { name: "b" }, { name: "c" }],
			});

			const result = await migrator._getTodo("up", 1);
			assertEquals(result, [{ name: "a" }]);
		});
		await step("limits down", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () => [{ name: "a" }, { name: "b" }, { name: "c" }],
				getRecords: () => [{ name: "a" }, { name: "b" }, { name: "c" }],
			});

			const result = await migrator._getTodo("down", 1);
			assertEquals(result, [{ name: "c" }]);
		});
	});

	await step("up", async ({ step }) => {
		await step("runs migrations", async () => {
			const result = [];

			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () => [
					{ name: "a", up: () => result.push(1) },
					{ name: "b", up: () => result.push(2) },
					{ name: "c", up: () => result.push(3) },
				],
				executeUp: (_, fn) => fn(),
			});

			await migrator.up();

			assertEquals(result, [1, 2, 3]);
		});
	});

	await step("down", async ({ step }) => {
		await step("runs migrations", async () => {
			const result = [];

			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () => [
					{ name: "a", down: () => result.push(1) },
					{ name: "b", down: () => result.push(2) },
					{ name: "c", down: () => result.push(3) },
				],
				getRecords: () => [{ name: "a" }, { name: "b" }, { name: "c" }],
				executeDown: (_, fn) => fn(),
			});

			await migrator.down();

			assertEquals(result, [3, 2, 1]);
		});
	});
});
