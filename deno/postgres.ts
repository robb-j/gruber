import { type SqlDependency } from "../core/types.ts";
import { Migrator, MigratorOptions, loadMigration } from "../core/migrator.ts";
import {
	executePostgresMigration,
	getPostgresMigrations,
	postgresBootstrapMigration,
} from "../core/postgres.ts";
import { extname } from "./deps.ts";

const migrationExtensions = new Set([".ts", ".js"]);

export interface PostgresMigratorOptions {
	sql: SqlDependency;
	directory: URL;
}

export function getPostgresMigratorOptions(
	options: PostgresMigratorOptions,
): MigratorOptions<SqlDependency> {
	return {
		getRecords() {
			return getPostgresMigrations(options.sql);
		},

		execute(def, direction) {
			return executePostgresMigration(def, direction, options.sql);
		},

		async getDefinitions() {
			const migrations = [
				{ name: "000-bootstrap.ts", ...postgresBootstrapMigration },
			];

			for await (const stat of Deno.readDir(options.directory)) {
				if (!stat.isFile) continue;
				if (!migrationExtensions.has(extname(stat.name))) continue;

				migrations.push(await loadMigration(stat.name, options.directory));
			}

			return migrations.sort((a, b) => a.name.localeCompare(b.name));
		},
	};
}

/** @deprecated use `getPostgresMigratorOptions` */
export const getDenoPostgresMigratorOptions = getPostgresMigratorOptions;

/**
 * This is a syntax sugar for `new Migrator(getPostgresMigratorOptions(...))`
 */
export function getPostgresMigrator(options: PostgresMigratorOptions) {
	if (!options.directory.pathname.endsWith("/")) {
		throw new Error("Postgres migration directory must end with a '/'");
	}
	return new Migrator(getPostgresMigratorOptions(options));
}

/** @deprecated use `getPostgresMigrator` */
export const getDenoPostgresMigrator = getPostgresMigrator;
