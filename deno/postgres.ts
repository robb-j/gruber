import {
	Migrator,
	MigratorOptions,
	defineMigration,
	loadMigration,
} from "../core/migrator.js";
import {
	executePostgresMigration,
	getPostgresMigrations,
	postgresBootstrapMigration,
} from "../core/postgres.js";
import { extname, type Sql } from "./deps.ts";

export { Migrator, defineMigration };

const migrationExtensions = new Set([".ts", ".js"]);

export interface PostgresMigratorOptions {
	sql: unknown;
	directory: URL;
}

export function getPostgresMigratorOptions(
	options: PostgresMigratorOptions,
): MigratorOptions<Sql> {
	return {
		getRecords() {
			return getPostgresMigrations(options.sql as Sql);
		},

		execute(def, direction) {
			return executePostgresMigration(def, direction, options.sql as Sql);
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
