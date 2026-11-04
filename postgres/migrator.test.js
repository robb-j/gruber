import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { trimIndentation } from "../core/utilities.ts";
import {
	_compareMigrationNames,
	_stripMigrationExtension,
	PostgresMigrator,
} from "./migrator.ts";
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
		transaction: mock.fn((block) => block(client)),
		dispose: mock.fn(() => {}),
		[Symbol.asyncDispose]: () => client.dispose(),
		// mock.fn doesn't play nicely with "await using"
	};
	return client;
}

function def(name) {
	return { name };
}

describe("_stripMigrationExtension", () => {
	it("removes script extensions", () => {
		assert.equal(_stripMigrationExtension("01-add-users"), "01-add-users");
		assert.equal(_stripMigrationExtension("01-add-users.js"), "01-add-users");
		assert.equal(_stripMigrationExtension("01-add-users.ts"), "01-add-users");
		assert.equal(_stripMigrationExtension("01-add-users.mjs"), "01-add-users");
		assert.equal(_stripMigrationExtension("01-add-users.cjs"), "01-add-users");
		assert.equal(_stripMigrationExtension("01-add-users.mts"), "01-add-users");
		assert.equal(_stripMigrationExtension("01-add-users.cts"), "01-add-users");
	});
	it("ignores names without an extension", () => {
		assert.equal(_stripMigrationExtension("01-add-users"), "01-add-users");
	});
	it("ignores other dots", () => {
		assert.equal(_stripMigrationExtension("01-v1.2-fix"), "01-v1.2-fix");
	});
});

describe("_compareMigrationNames", () => {
	it("ignores extensions", () => {
		assert.equal(
			_compareMigrationNames("001-add-users", "001-add-users.js"),
			0,
		);
		assert.equal(
			_compareMigrationNames("001-add-users.js", "001-add-users.js"),
			0,
		);
		assert.equal(
			_compareMigrationNames("001-add-users.js", "001-add-users.ts"),
			0,
		);
		assert.equal(
			_compareMigrationNames("001-add-users.mjs", "001-add-users.mts"),
			0,
		);
	});
});

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
		it("ignores extensions on records", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
			]);

			const result = migrator.findPending([{ name: "01-add-users.js" }]);

			assert.deepEqual(result, [{ name: "02-add-pets" }]);
		});
		it("ignores extensions on definitions", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users.js" },
				{ name: "02-add-pets.ts" },
			]);

			const result = migrator.findPending([{ name: "01-add-users" }]);

			assert.deepEqual(result, [{ name: "02-add-pets.ts" }]);
		});
		it("sorts ignoring extensions", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users-table.ts" },
				{ name: "01-add-users.js" },
			]);

			const result = migrator.findPending([]);

			assert.deepEqual(result, [
				{ name: "01-add-users.js" },
				{ name: "01-add-users-table.ts" },
			]);
		});
	});

	describe("up", () => {
		it("runs pending migrations", async () => {
			const def = { name: "01-add-users", up: mock.fn() };
			const migrator = new PostgresMigrator(postgres(), [def]);

			await migrator.up();

			assert.equal(def.up.mock.callCount(), 1);
		});
		it("runs each migration in a transaction", async () => {
			const sql = postgres();
			const migrator = new PostgresMigrator(sql, [
				{ name: "01-add-users", up: mock.fn() },
				{ name: "02-add-pets", up: mock.fn() },
			]);

			await migrator.up();

			assert.equal(sql.transaction.mock.callCount(), 2);
		});
		it("propagates migration errors", async () => {
			const sql = postgres();
			const error = new Error("bad migration");
			const migrator = new PostgresMigrator(sql, [
				{
					name: "01-add-users",
					up: mock.fn(() => {
						throw error;
					}),
				},
			]);

			await assert.rejects(() => migrator.up(), error);
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
		it("stores the full name", async () => {
			const sql = postgres();
			const migrator = new PostgresMigrator(sql, [
				{ name: "01-add-users.js", up: mock.fn() },
			]);

			await migrator.up();

			assert.equal(
				_prettyPostgresQuery(sql.execute.mock.calls[1]?.arguments),
				trimIndentation`
					INSERT INTO migrations
					{"name":"01-add-users.js"}
				`,
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
		it("ignores extensions on records", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users" },
				{ name: "02-add-pets" },
			]);

			const result = migrator.findReversions([{ name: "01-add-users.js" }]);

			assert.deepEqual(result, [{ name: "01-add-users" }]);
		});
		it("ignores extensions on definitions", () => {
			const migrator = new PostgresMigrator(postgres(), [
				{ name: "01-add-users.js" },
				{ name: "02-add-pets.ts" },
			]);

			const result = migrator.findReversions([{ name: "01-add-users" }]);

			assert.deepEqual(result, [{ name: "01-add-users.js" }]);
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
		it("runs each reversion in a transaction", async () => {
			const sql = postgres();
			sql.execute.mock.mockImplementationOnce(() => [{ name: "01-add-users" }]);

			const migrator = new PostgresMigrator(sql, [
				{ name: "01-add-users", down: mock.fn() },
			]);
			await migrator.down();
			assert.equal(sql.transaction.mock.callCount(), 1);
		});
		it("propagates reversion errors", async () => {
			const sql = postgres();
			sql.execute.mock.mockImplementationOnce(() => [{ name: "01-add-users" }]);
			const error = new Error("bad reversion");

			const migrator = new PostgresMigrator(sql, [
				{
					name: "01-add-users",
					down: mock.fn(() => {
						throw error;
					}),
				},
			]);
			await assert.rejects(() => migrator.down(), error);
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
		it("deletes records stored with an extension", async () => {
			const sql = postgres();
			sql.execute.mock.mockImplementationOnce(() => [
				{ name: "01-add-users.js" },
			]);

			const def = { name: "01-add-users", down: mock.fn() };
			const migrator = new PostgresMigrator(sql, [def]);
			await migrator.down();

			assert.equal(def.down.mock.callCount(), 1);

			const query = _decomposePostgresQuery(
				sql.execute.mock.calls[1]?.arguments,
			);
			assert.deepEqual(query.params[1], "01-add-users.js");
		});
		it("deletes records stored with a different extension", async () => {
			const sql = postgres();
			sql.execute.mock.mockImplementationOnce(() => [
				{ name: "01-add-users.js" },
			]);

			const def = { name: "01-add-users.ts", down: mock.fn() };
			const migrator = new PostgresMigrator(sql, [def]);
			await migrator.down();

			const query = _decomposePostgresQuery(
				sql.execute.mock.calls[1]?.arguments,
			);
			assert.deepEqual(query.params[1], "01-add-users.js");
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
