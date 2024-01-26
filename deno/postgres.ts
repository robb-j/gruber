import {
	MigrationOptions,
	Migrator,
	defineMigration,
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
		...getPostgresMigratorOptions({ sql: options.sql }),

		async getDefinitions() {
			const migrations = [{ name: "000-bootstrap.ts", ...bootstrapMigration }];

			for await (const stat of Deno.readDir(options.directory)) {
				if (!stat.isFile) continue;
				if (!migrationExtensions.has(extname(stat.name))) continue;

				const url = new URL(stat.name, options.directory);

				const def = await import(url.toString());

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
 * This is a syntax sugar for `new Migrator(getDenoPostgresMigratorOptions(...))`
 */
export function getDenoPostgresMigrator(options: DenoPostgresMigratorOptions) {
	if (!options.directory.pathname.endsWith("/")) {
		throw new Error("Postgres migration directory must end with a '/'");
	}
	return new Migrator(getDenoPostgresMigratorOptions(options));
}
