import fs from "node:fs/promises";
import path from "node:path";
import { Sql } from "postgres";

import { Migrator, MigratorOptions, loadMigration } from "../core/migrator.ts";
import {
	executePostgresMigration,
	getPostgresMigrations,
	postgresBootstrapMigration,
} from "../core/postgres.ts";

const migrationExtensions = new Set([".ts", ".js"]);

export interface PostgresMigratorOptions {
	sql: Sql;
	directory: URL;
}

export function getPostgresMigratorOptions(
	options: PostgresMigratorOptions,
): MigratorOptions<Sql> {
	return {
		getRecords() {
			return getPostgresMigrations(options.sql);
		},

		execute(def, direction) {
			return executePostgresMigration(def, direction, options.sql);
		},

		async getDefinitions() {
			const migrations = [
				{ name: "000-bootstrap.js", ...postgresBootstrapMigration },
			];

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
 * @param {PostgresMigratorOptions} options
 */
export function getPostgresMigrator(options: PostgresMigratorOptions) {
	if (!options.directory.pathname.endsWith("/")) {
		throw new Error("Postgres migration directory must end with a '/'");
	}
	return new Migrator(getPostgresMigratorOptions(options));
}

/** @deprecated use `getPostgresMigrator` */
export const getNodePostgresMigrator = getPostgresMigrator;
