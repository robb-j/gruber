import { defineMigration } from "./migrator.js";

/** @typedef {import("postgres").Sql} Sql */
/** @typedef {import("./migrator.js").MigratorOptions} MigratorOptions */
/** @typedef {import("./migrator.js").MigrationRecord} MigrationRecord */
/** @typedef {import("./migrator.js").MigrationDefinition} MigrationDefinition */

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

/**
 * @param {MigrationDefinition} def
 * @param {"up" | "down"} direction
 * @param {Sql} sql
 */
export function _execute(def, direction, sql) {
	return sql.begin((sql) => {
		console.log("migrate %s", direction, def.name);
		if (direction === "up") return _executeUp(def, sql);
		if (direction === "down") return _executeDown(def, sql);
	});
}

/**
 * @param {MigrationDefinition} def
 * @param {Sql} sql
 */
export async function _executeUp(def, sql) {
	await def.up(sql);

	await sql`
		INSERT INTO migrations (name) VALUES (${def.name})
	`;
}

/**
 * @param {MigrationDefinition} def
 * @param {Sql} sql
 */
export async function _executeDown(def, sql) {
	await def.down(sql);

	if (def.down !== bootstrapMigration.down) {
		await sql`DELETE FROM migrations WHERE name = ${def.name}`;
	}
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
 * @typedef {object} PostgresMigratorOptions
 * @property {Sql} sql
 */

/**
 * @param {PostgresMigratorOptions} options
 * @returns {MigratorOptions<Sql>}
 */
export function getPostgresMigratorOptions(options) {
	return {
		getRecords: () => _getMigrationRecords(options.sql),
		execute: (def, direction) => _execute(def, direction, options.sql),
		getDefinitions: () => [bootstrapMigration],
	};
}
