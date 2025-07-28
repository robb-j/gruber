import {
	defineMigration,
	type MigrateDirection,
	type MigrationDefinition,
	type MigrationRecord,
} from "../core/mod.ts";
import { type PostgresService } from "./postgres-service.ts";

/**
 * A record in a postgres database containing information about a migration that has been run.
 *
 * ```js
 * const record = {
 *   name: '001-add-users-table.js',
 *   created: new Date()
 * }
 * ```
 */
export interface PostgresMigrationRecord {
	name: string;
	created: Date;
}

/**
 * Query the postgres database to find migrations that have already been performed.
 * Returning an array of `PostgresMigrationRecord`.
 *
 * ```js
 * const sql // PostgresService
 * const records = await getPostgresMigrations(sql)
 * ```
 */
export async function getPostgresMigrations(
	pg: PostgresService,
): Promise<MigrationRecord[]> {
	try {
		const rows = await pg.execute<PostgresMigrationRecord>`
			SELECT name, created
			FROM migrations
		`;
		return rows.map(({ name }) => ({ name }));
	} catch {
		return [];
	}
}

/**
 * Perform either the **up** or **down** postgres migration and record what happened.
 * This will first start a transaction, so if anything goes wrong the whole operation is aborted.
 * Within the transaction, it attempts the run the action (either **up** or **down**) as specified.
 *
 * After the action is ran, it will follow up with updating the migration records.
 * For an **up** action, it will create a new `PostgresMigrationRecord`
 * and insert it into the database.
 * For a **down** action, it will remove the corresponding `PostgresMigrationRecord`.
 *
 * > There is an edge case where it will not remove the record if running the `postgresBootstrapMigration` action,
 * > because that migration deletes the migration table itself so would be pointless.
 *
 * ```js
 * const sql // PostgresService
 * const definition = definePostgresMigration(...)
 *
 * await executePostgresMigration(definition, "up", sql)
 * ```
 */
export function executePostgresMigration(
	def: MigrationDefinition<PostgresService>,
	direction: MigrateDirection,
	sql: PostgresService,
): Promise<void> {
	return sql.transaction(async (sql) => {
		console.log("migrate %s", direction, def.name);

		if (direction === "up") {
			await def.up(sql);

			await sql.execute`
				INSERT INTO migrations (name) VALUES (${def.name})
			`;
			return;
		}

		if (direction === "down") {
			await def.down(sql);

			if (def.down !== postgresBootstrapMigration.down) {
				await sql.execute`
					DELETE FROM migrations WHERE name = ${def.name}
				`;
			}
			return;
		}

		throw new TypeError(`Invalid direction: ${direction}`);
	});
}

/**
 * This is a `MigrationDefinition` to bootstrap postgres migrations.
 * It sets up the initial "migrations" table that all other
 * migrations will be recorded in.
 */
export const postgresBootstrapMigration = defineMigration<PostgresService>({
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
});

/**
 * A typed version of `defineMigration` that specalizes for a ` PostgresService`.
 * This is mostly useful to get a strongly typed `sql` parameter.
 *
 * ```js
 * import { definePostgresMigration } from "gruber"
 *
 * export default definePostgresMigration({
 *   async up(sql) {
 *     await sql.execute`
 *       CREATE TABLE users ...
 *     `
 *   },
 *   async down(sql) {
 *     await sql.execute`
 *       DROP TABLE users
 *     `
 *   }
 * })
 * ```
 */
export const definePostgresMigration = defineMigration<PostgresService>;
