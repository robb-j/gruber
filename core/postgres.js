import { defineMigration } from "./migrator.js";

/** @typedef {import("postgres").Sql} Sql */
/** @typedef {import("./migrator.js").MigratorOptions} MigratorOptions */
/** @typedef {import("./migrator.js").MigrationRecord} MigrationRecord */

/**
	@param {Sql} sql
	@returns {Promise<MigrationRecord[]>}
	*/
export async function _getMigrationRecords(sql) {
	try {
		const rows = await sql`
      SELECT name, created
      FROM migrations
    `;
		return rows.map(({ name }) => ({ name }));
	} catch {
		return [];
	}
}

/** @param {Sql} sql */
export function _executeUp(name, fn, sql) {
	return sql.begin(async (sql) => {
		console.log("migrate", name);
		await fn(sql);
		await sql`INSERT INTO migrations (name) VALUES (${name})`;
	});
}

/** @param {Sql} sql */
export function _executeDown(name, fn, sql) {
	return sql.begin(async (sql) => {
		console.log("migrate", name);
		await fn(sql);

		if (fn !== bootstrapMigration.down) {
			await sql`DELETE FROM migrations WHERE name = ${name}`.catch(() => {});
		}
	});
}

export const bootstrapMigration = defineMigration({
	async up(sql) {
		await sql`
			CREATE TABLE "migrations" (
				"name" varchar(255) PRIMARY KEY,
				"created" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
			)
		`;
	},
	async down(sql) {
		await sql`
			DROP TABLE "migrations"
		`;
	},
});

/**
	@param {Sql} sql 
	@returns {MigratorOptions<Sql>}
	*/
export function postgresOptions(sql) {
	return {
		getRecords: () => _getMigrationRecords(sql),
		executeUp: (name, fn) => _executeUp(name, fn, sql),
		executeDown: (name, fn) => _executeDown(name, fn, sql),
		getDefinitions: () => [bootstrapMigration],
	};
}
