import { Structure } from "../config/mod.ts";
import { type MigrationDefinition } from "../core/mod.ts";
import type { PostgresClient } from "./postgres-client.ts";
import type { PostgresMigrationRecord } from "./postgres-migrator.ts";
import { Table } from "./tables.ts";

const MigrationTable = Table.define<PostgresMigrationRecord>("migrations", {
	name: Structure.string(),
	created: Structure.date(),
});

// export interface PostgresMigratorOptions {
// 	verbose?: boolean;
// }

/**
 * @internal
 *
 * Remove a script file extension (.js .ts .mjs .cjs .mts .cts) from a migration name,
 * e.g. "001-add-users.js" → "001-add-users"
 */
export function _stripMigrationExtension(name: string) {
	return name.replace(/\.[mc]?[jt]s$/, "");
}

/**
 * @internal
 *
 * Compare two migration names for sorting, ignoring their file extensions,
 * e.g. "001-add-users.js" sorts before "001-add-users-table.ts"
 */
export function _compareMigrationNames(a: string, b: string) {
	return _stripMigrationExtension(a).localeCompare(_stripMigrationExtension(b));
}

/**
 * @unstable
 *
 * Runs migrations against a {@link PostgresClient} and records them in a "migrations" table.
 *
 * Migrations are recorded by their full name, e.g. "001-add-users.js".
 * File extensions are ignored when checking which migrations have been applied,
 * so renaming "001-add-users.js" to "001-add-users.ts" won't run it again.
 *
 * ```js
 * const migrator = new PostgresMigrator(
 *   new PostgresClient(…),
 *   [...definitions]
 * )
 * ```
 */
export class PostgresMigrator {
	#postgres;
	#definitions;
	// #options;
	constructor(
		postgres: PostgresClient,
		definitions: MigrationDefinition<PostgresClient>[],
		// options: PostgresMigratorOptions = {},
	) {
		this.#postgres = postgres;
		this.#definitions = definitions;
		// this.#options = options;
	}

	#debug(message: string, ...args: any[]) {
		// if (!this.#options.verbose) return;
		// console.debug("[postgres] " + message, ...args);
	}

	/**
	 * Get the internal definitions
	 *
	 * ```js
	 * const defs = migrator.getDefinitions()
	 * ```
	 */
	getDefinitions() {
		return this.#definitions;
	}

	/**
	 * Look up records that have been aplied in the database
	 *
	 * ```js
	 * const records = await migrator.getAppliedRecords()
	 * ```
	 */
	async getAppliedRecords(): Promise<PostgresMigrationRecord[]> {
		try {
			return await MigrationTable.select().run(this.#postgres);
		} catch {
			return [];
		}
	}

	/**
	 * Filter the existing definitions against ones that have been applied
	 * to find ones that need to be applied.
	 *
	 * ```js
	 * const definitions = await migrator.findPending(
	 *   await migrator.getAppliedRecords()
	 * )
	 * ```
	 */
	findPending(applied: PostgresMigrationRecord[], n = Infinity) {
		const ran = new Set(applied.map((r) => _stripMigrationExtension(r.name)));

		return this.#definitions
			.filter((def) => !ran.has(_stripMigrationExtension(def.name)))
			.sort((a, b) => _compareMigrationNames(a.name, b.name))
			.slice(0, n);
	}

	/**
	 * Run `n` pending migrations
	 *
	 * ```js
	 * // Run all pending migrations
	 * await migrator.up()
	 *
	 * // Run the next 2 migrations
	 * await migrator.up(2)
	 * ```
	 */
	async up(n = Infinity) {
		const pending = this.findPending(await this.getAppliedRecords(), n);

		for (const def of pending) {
			this.#debug("running", def.name);

			await this.#postgres.transaction(async (trx) => {
				await def.up(trx);
				await MigrationTable.insert().values({ name: def.name }).run(trx);
			});
		}

		return pending.length;
	}

	/**
	 * Filter the existing definitions against ones that have been applied
	 * to find ones to be reverted.
	 *
	 * ```js
	 * const definitions = await migrator.findReversions(
	 *   await migrator.getAppliedRecords()
	 * )
	 * ```
	 */
	findReversions(applied: PostgresMigrationRecord[], n = Infinity) {
		const ran = new Set(applied.map((r) => _stripMigrationExtension(r.name)));

		return this.#definitions
			.filter((def) => ran.has(_stripMigrationExtension(def.name)))
			.sort((a, b) => _compareMigrationNames(b.name, a.name))
			.slice(0, n);
	}

	/**
	 * Revert `n` applied migrations
	 *
	 * ```js
	 * // Revert all migrations
	 * await migrator.down()
	 *
	 * // Revert the next 2 migrations
	 * await migrator.down(2)
	 * ```
	 */
	async down(n = Infinity) {
		const applied = await this.getAppliedRecords();
		const reversions = this.findReversions(applied, n);

		for (const def of reversions) {
			this.#debug("running", def.name);

			// Delete the exact stored names, records may or may not have an extension
			const key = _stripMigrationExtension(def.name);
			const names = applied
				.map((r) => r.name)
				.filter((name) => _stripMigrationExtension(name) === key);

			if (names.length !== 1) throw new Error("non-one migrations to revert");

			await this.#postgres.transaction(async (trx) => {
				await MigrationTable.delete().where`name = ${names[0]}`.run(trx);
				await def.down(trx);
			});
		}

		return reversions.length;
	}
}

export const postgresMigrations: MigrationDefinition<PostgresClient>[] = [
	{
		name: "000-bootstrap",
		async up(sql) {
			await sql.execute`
				CREATE TABLE "migrations" (
					"name" varchar(255) PRIMARY KEY,
					"created" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
				)
			`;
		},
		async down(sql) {
			await sql.execute`
				DROP TABLE "migrations"
			`;
		},
	},
];
