import fs from "node:fs/promises";
import path from "node:path";

import { Migrator, defineMigration } from "../core/migrator.js";
import {
	getPostgresMigratorOptions,
	bootstrapMigration,
} from "../core/postgres.js";

export { Migrator, defineMigration };

/** @typedef {import("postgres").Sql} Sql */

/**
 * @template T
 * @typedef {import("../core/migrator.js").MigratorOptions<T>} MigratorOptions
 */

/**
 * @template T
 * @typedef {import("../core/migrator.js").MigrationOptions<T>} MigrationOptions
 */

const migrationExtensions = new Set([".ts", ".js"]);

/**
 * TODO: this isn't documented
 * @param {MigrationOptions<Sql>} options
 */
export function definePostgresMigration(options) {
	return defineMigration(options);
}

/**
 * @typedef {object} NodePostgresMigratorOptions
 * @property {Sql} sql
 * @property {URL} directory
 */

/**
 * @param {NodePostgresMigratorOptions} options
 * @returns {MigratorOptions}
 */
export function getNodePostgresMigratorOptions(options) {
	return {
		...getPostgresMigratorOptions({ sql: options.sql }),

		async getDefinitions() {
			const migrations = [{ name: "000-bootstrap.js", ...bootstrapMigration }];

			const files = await fs.readdir(options.directory, {
				withFileTypes: true,
			});

			for (const stat of files) {
				const url = new URL(stat.name, options.directory);

				if (!stat.isFile()) continue;
				if (!migrationExtensions.has(path.extname(stat.name))) continue;

				const def = await import(url);

				if (def.default.up && typeof def.default.up !== "function") {
					throw new Error(`migration "${stat.name}" - up is not a function`);
				}
				if (def.default.down && typeof def.default.down !== "function") {
					throw new Error(`migration "${stat.name}" - down is not a function`);
				}

				migrations.push({
					name: stat.name,
					up: def.default.up ?? null,
					down: def.default.down ?? null,
				});
			}

			return migrations.sort((a, b) => a.name.localeCompare(b.name));
		},
	};
}

/**
 * This is a syntax sugar for `new Migrator(getNodePostgresMigratorOptions(...))`
 *
 * @param {NodePostgresMigratorOptions} options
 */
export function getNodePostgresMigrator(options) {
	if (!options.directory.pathname.endsWith("/")) {
		throw new Error("Postgres migration directory must end with a '/'");
	}
	return new Migrator(getNodePostgresMigratorOptions(options));
}
