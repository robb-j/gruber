import { Migrator, defineMigration } from "./migrator.js";

/** @typedef {import("postgres").Sql} Sql */
/** @typedef {import("./migrator.js").MigratorOptions} MigratorOptions */

/** @param {URL} directory */
export async function _getDefinitions(directory) {
	// TODO: this can't be cross-platform
	return [_bootstrapMigration];
}

/** @param {Sql} sql */
export async function _getRecords(sql) {
	try {
		const rows = await sql`
      SELECT name, created
      FROM migrations
    `;
		return rows.map((r) => r.name);
	} catch {
		return [];
	}
}

/**
 * @param {Sql} sql
 * @param {string} name
 */
export async function _storeMigration(sql, name) {
	await sql`
    INSERT INTO migrations (name) VALUES (${name})
  `;
}

/** @param {Sql} sql */
export function _execute(fn, sql) {}

export const _bootstrapMigration = defineMigration({
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

export class PostgresMigrator extends Migrator {
	/**
	 * @param {Sql} sql
	 * @param {URL} directory
	 * @returns {MigratorOptions<Sql>}
	 */
	static getOptions(sql, directory) {
		return {
			getDefinitions: () => _getDefinitions(directory),
			getRecords: () => _getRecords(sql),
			execute: (fn) => _execute(fn, sql),
		};
	}

	/**
	 * @param {Sql} sql
	 * @param {URL} directory
	 */
	constructor(sql, directory) {
		super(PostgresMigrator.getOptions(sql, directory));
		this.postgres = sql;
		this.directory = directory;
	}

	// ...
}
