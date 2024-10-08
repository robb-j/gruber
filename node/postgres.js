import fs from "node:fs/promises";
import path from "node:path";

import { Migrator, defineMigration, loadMigration } from "../core/migrator.js";
import {
	getPostgresMigratorOptions as getCorePostgresMigratorOptions,
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
export function getPostgresMigratorOptions(options) {
	return {
		...getCorePostgresMigratorOptions({ sql: options.sql }),

		async getDefinitions() {
			const migrations = [{ name: "000-bootstrap.js", ...bootstrapMigration }];

			const files = await fs.readdir(options.directory, {
				withFileTypes: true,
			});

			for (const stat of files) {
				if (!stat.isFile()) continue;
				if (!migrationExtensions.has(path.extname(stat.name))) continue;

				migrations.push(await loadMigration(stat.name, options.directory));
			}

			return migrations.sort((a, b) => a.name.localeCompare(b.name));
		},
	};
}

/** @deprecated use `getPostgresMigratorOptions` */
export const getNodePostgresMigratorOptions = getPostgresMigratorOptions;

/**
 * This is a syntax sugar for `new Migrator(getPostgresMigratorOptions(...))`
 *
 * @param {NodePostgresMigratorOptions} options
 */
export function getPostgresMigrator(options) {
	if (!options.directory.pathname.endsWith("/")) {
		throw new Error("Postgres migration directory must end with a '/'");
	}
	return new Migrator(getPostgresMigratorOptions(options));
}

/** @deprecated use `getPostgresMigrator` */
export const getNodePostgresMigrator = getPostgresMigrator;
