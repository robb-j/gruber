import {
	MigrationDefinition,
	MigrationOptions,
	Migrator,
	defineMigration,
	loadMigration,
} from "../core/migrator.js";
import {
	getPostgresMigratorOptions,
	bootstrapMigration,
} from "../core/postgres.js";
import { extname, type Sql } from "./deps.ts";

export { Migrator, defineMigration };

const migrationExtensions = new Set([".ts", ".js"]);

export interface DenoPostgresMigratorOptions {
	sql: unknown;
	directory: URL;
}

// TODO: this isn't documented
export function definePostgresMigration(options: MigrationOptions<Sql>) {
	return defineMigration(options);
}

export function getDenoPostgresMigratorOptions(
	options: DenoPostgresMigratorOptions,
) {
	return {
		...getPostgresMigratorOptions({ sql: options.sql as any }),

		async getDefinitions() {
			const migrations = [{ name: "000-bootstrap.ts", ...bootstrapMigration }];

			for await (const stat of Deno.readDir(options.directory)) {
				if (!stat.isFile) continue;
				if (!migrationExtensions.has(extname(stat.name))) continue;

				migrations.push(await loadMigration(stat.name, options.directory));
			}

			return migrations.sort((a, b) => a.name.localeCompare(b.name));
		},
	};
}

/**
 * This is a syntax sugar for `new Migrator(getDenoPostgresMigratorOptions(...))`
 */
export function getDenoPostgresMigrator(options: DenoPostgresMigratorOptions) {
	if (!options.directory.pathname.endsWith("/")) {
		throw new Error("Postgres migration directory must end with a '/'");
	}
	return new Migrator(getDenoPostgresMigratorOptions(options));
}
