import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	Migrator,
	defineMigration,
	type MigrationDefinition,
	type MigratorOptions,
} from "./migrator.ts";

const bareOptions: MigratorOptions<any> = {
	getDefinitions: async () => [],
	getRecords: async () => [],
	execute() {},
};

describe("defineMigration", () => {
	it("formats the options", () => {
		const result = defineMigration({
			up() {},
			down() {},
		});
		assert.deepEqual(result, {
			up: result.up,
			down: result.down,
		});
	});
});

function def(name: string) {
	return { name } as MigrationDefinition<any>;
}

describe("Migrator", () => {
	describe("_getTodo", () => {
		it("gets pending", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () =>
					[{ name: "a" }, { name: "b" }, { name: "c" }] as any,
			});

			const result = await migrator._getTodo("up", -1);
			assert.deepEqual(result, [{ name: "a" }, { name: "b" }, { name: "c" }]);
		});
		it("gets executed", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () =>
					[{ name: "a" }, { name: "b" }, { name: "c" }] as any,
				getRecords: () => [{ name: "a" }, { name: "b" }, { name: "c" }] as any,
			});

			const result = await migrator._getTodo("down", -1);
			assert.deepEqual(result, [{ name: "c" }, { name: "b" }, { name: "a" }]);
		});
		it("skips previous", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () =>
					[{ name: "a" }, { name: "b" }, { name: "c" }] as any,
				getRecords: () => [{ name: "a" }] as any,
			});

			const result = await migrator._getTodo("up", -1);
			assert.deepEqual(result, [{ name: "b" }, { name: "c" }]);
		});
		it("limits up", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () =>
					[{ name: "a" }, { name: "b" }, { name: "c" }] as any,
			});

			const result = await migrator._getTodo("up", 1);
			assert.deepEqual(result, [{ name: "a" }]);
		});
		it("limits down", async () => {
			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () =>
					[{ name: "a" }, { name: "b" }, { name: "c" }] as any,
				getRecords: () => [{ name: "a" }, { name: "b" }, { name: "c" }] as any,
			});

			const result = await migrator._getTodo("down", 1);
			assert.deepEqual(result, [{ name: "c" }]);
		});
	});

	describe("up", () => {
		it("runs migrations", async () => {
			const result: any[] = [];

			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () =>
					[
						{ name: "a", up: () => result.push(1) },
						{ name: "b", up: () => result.push(2) },
						{ name: "c", up: () => result.push(3) },
					] as any,
				execute: (def, dir) => def[dir]({}),
			});

			await migrator.up();

			assert.deepEqual(result, [1, 2, 3]);
		});
	});

	describe("down", () => {
		it("runs migrations", async () => {
			const result: any[] = [];

			const migrator = new Migrator({
				...bareOptions,
				getDefinitions: () =>
					[
						{ name: "a", down: () => result.push(1) },
						{ name: "b", down: () => result.push(2) },
						{ name: "c", down: () => result.push(3) },
					] as any,
				getRecords: () => [{ name: "a" }, { name: "b" }, { name: "c" }] as any,
				execute: (def, dir) => def[dir]({}),
			});

			await migrator.down();

			assert.deepEqual(result, [3, 2, 1]);
		});
	});
});
