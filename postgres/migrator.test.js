import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { trimIndentation } from "../core/utilities.ts";
import { PostgresMigrator } from "./migrator.ts";
import {
	_decomposePostgresQuery,
	_prettyPostgresQuery,
	Postgres,
} from "./postgres-client.ts";

// EXPERIMENT: should tests be plain JavaScript?
// -> do types get in the way of testing?
// -> do types make tests worse?
// -> is lower-level JavaScript tests better to test mode?

function postgres() {
	const client = {
		execute: mock.fn(() => []),
		transaction: mock.fn(() => client),
		dispose: mock.fn(() => {}),
		[Symbol.asyncDispose]: () => client.dispose(),
		// mock.fn doesn't play nicely with "await using"
	};
	return client;
}

function def(name) {
	return { name };
}

describe("PostgresMigrator", () => {
	describe("constructor", () => {
		new PostgresMigrator(postgres(), []);
	});

	describe("getDefinitions", () => {
		it("returns defs", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "migration_a" },
				{ name: "migration_b" },
				{ name: "migration_c" },
			]);
			assert.deepEqual(migrator.getDefinitions(), [
				{ name: "migration_a" },
				{ name: "migration_b" },
				{ name: "migration_c" },
			]);
		});
	});

	describe("getAppliedRecords", () => {
		it("queries for records", async () => {
			const sql = postgres();
			sql.execute.mock.mockImplementationOnce(() => [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
			]);

			const migrator = new PostgresMigrator(sql, []);
			const result = await migrator.getAppliedRecords();

			assert.equal(
				_prettyPostgresQuery(sql.execute.mock.calls[0].arguments),
				trimIndentation`
					SELECT name, created
					FROM migrations
				`,
			);

			assert.deepEqual(result, [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
			]);
		});
	});

	describe("findPending", () => {
		it("finds unapplied definitions", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
				{ name: "03-alter-users" },
			]);

			const result = migrator.findPending([{ name: "01-add-users" }]);

			assert.deepEqual(result, [
				{ name: "02-add-pets" },
				{ name: "03-alter-users" },
			]);
		});
		it("limits records", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
				{ name: "03-alter-users" },
			]);

			const result = migrator.findPending([{ name: "01-add-users" }], 1);

			assert.deepEqual(result, [{ name: "02-add-pets" }]);
		});
	});

	describe("up", () => {
		it("runs pending migrations", async () => {
			const def = { name: "01-add-users", up: mock.fn() };
			const migrator = new PostgresMigrator(postgres(), [def]);

			await migrator.up();

			assert.equal(def.up.mock.callCount(), 1);
		});
		it("runs disposes the transaction", async () => {
			const sql = postgres();
			const def = { name: "01-add-users", up: mock.fn() };
			const migrator = new PostgresMigrator(sql, [def]);

			await migrator.up();

			assert.equal(sql.dispose.mock.callCount(), 1);
		});
		it("creates a migration record", async () => {
			const sql = postgres();
			const migrator = new PostgresMigrator(sql, [
				{ name: "01-add-users", up: mock.fn() },
			]);

			await migrator.up();

			assert.equal(sql.execute.mock.callCount(), 2);

			assert.match(
				_prettyPostgresQuery(sql.execute.mock.calls[1]?.arguments),
				/INSERT INTO migrations/,
			);
		});
		it("skips applied migrations", async () => {
			const sql = postgres();
			const defs = [
				{ name: "01-add-users", up: mock.fn() },
				{ name: "02-add-pets", up: mock.fn() },
				{ name: "03-alter-users", up: mock.fn() },
			];
			sql.execute.mock.mockImplementationOnce(() => [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
			]);

			const migrator = new PostgresMigrator(sql, defs);

			await migrator.up();

			assert.equal(defs[0].up.mock.callCount(), 0);
			assert.equal(defs[1].up.mock.callCount(), 0);
			assert.equal(defs[2].up.mock.callCount(), 1);
		});
		it("limits runs", async () => {
			const sql = postgres();
			const defs = [
				{ name: "01-add-users", up: mock.fn() },
				{ name: "02-add-pets", up: mock.fn() },
				{ name: "03-alter-users", up: mock.fn() },
			];

			const migrator = new PostgresMigrator(sql, defs);

			await migrator.up(2);

			assert.equal(defs[0].up.mock.callCount(), 1);
			assert.equal(defs[1].up.mock.callCount(), 1);
			assert.equal(defs[2].up.mock.callCount(), 0);
		});
	});

	describe("findReversions", () => {
		it("finds unapplied definitions", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
				{ name: "03-alter-users" },
			]);

			const result = migrator.findReversions([{ name: "01-add-users" }]);

			assert.deepEqual(result, [{ name: "01-add-users" }]);
		});
		it("limits definitions", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
				{ name: "03-alter-users" },
			]);

			const result = migrator.findReversions(
				[{ name: "01-add-users" }, { name: "02-add-pets" }],
				1,
			);

			assert.deepEqual(result, [{ name: "02-add-pets" }]);
		});
	});

	describe("down", () => {
		it("runs reversions", async () => {
			const sql = postgres();
			sql.execute.mock.mockImplementationOnce(() => [{ name: "01-add-users" }]);

			const def = { name: "01-add-users", down: mock.fn() };
			const migrator = new PostgresMigrator(sql, [def]);

			await migrator.down();

			assert.equal(def.down.mock.callCount(), 1);
		});
		it("runs disposes the transaction", async () => {
			const sql = postgres();
			sql.execute.mock.mockImplementationOnce(() => [{ name: "01-add-users" }]);

			const migrator = new PostgresMigrator(sql, [
				{ name: "01-add-users", down: mock.fn() },
			]);
			await migrator.down();
			assert.equal(sql.dispose.mock.callCount(), 1);
		});
		it("deletes migration record", async () => {
			const sql = postgres();
			sql.execute.mock.mockImplementationOnce(() => [{ name: "01-add-users" }]);

			const migrator = new PostgresMigrator(sql, [
				{ name: "01-add-users", down: mock.fn() },
			]);
			await migrator.down();

			assert.equal(sql.execute.mock.callCount(), 2);

			const query = _decomposePostgresQuery(
				sql.execute.mock.calls[1]?.arguments,
			);

			assert.equal(
				query.text,
				trimIndentation`
					DELETE FROM $1
					WHERE name = $2
				`,
			);

			assert.deepEqual(query.params, [
				Postgres.escape("migrations"),
				"01-add-users",
			]);
		});
		it("skips pending migrations", async () => {
			const sql = postgres();
			const defs = [
				{ name: "01-add-users", down: mock.fn() },
				{ name: "02-add-pets", down: mock.fn() },
				{ name: "03-alter-users", down: mock.fn() },
			];
			sql.execute.mock.mockImplementationOnce(() => [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
			]);

			const migrator = new PostgresMigrator(sql, defs);
			await migrator.down();

			assert.equal(defs[0].down.mock.callCount(), 1);
			assert.equal(defs[1].down.mock.callCount(), 1);
			assert.equal(defs[2].down.mock.callCount(), 0);
		});
		it("limits runs", async () => {
			const sql = postgres();
			const defs = [
				{ name: "01-add-users", down: mock.fn() },
				{ name: "02-add-pets", down: mock.fn() },
				{ name: "03-alter-users", down: mock.fn() },
			];

			sql.execute.mock.mockImplementationOnce(() => [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
			]);

			const migrator = new PostgresMigrator(sql, defs);
			await migrator.down(1);

			assert.equal(defs[0].down.mock.callCount(), 0);
			assert.equal(defs[1].down.mock.callCount(), 1);
			assert.equal(defs[2].down.mock.callCount(), 0);
		});
	});
});
