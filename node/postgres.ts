import fs from "node:fs/promises";
import path from "node:path";
import type { SqlDependency } from "../core/types.ts";

import {
	loadMigration,
	Migrator,
	type MigratorOptions,
} from "../core/migrator.ts";
import {
	executePostgresMigration,
	getPostgresMigrations,
	getPostgresUtility,
	postgresBootstrapMigration,
	PostgresClause,
	PostgresJson,
	PostgresPrepared,
	type PostgresClient,
	type PostgresValue,
} from "../postgres/mod.ts";

const migrationExtensions = new Set([".ts", ".js"]);

export interface PostgresMigratorOptions {
	sql: unknown;
	directory: URL;
}

/**
 * Create a standardish Postgres Migrator based on the filesystem and an sql connection from [postgres.js](https://github.com/porsager/postgres)
 *
 * ```js
 * const sql = postgres(…)
 *
 * const migrator = getPostgresMigratorOptions({
 * 	sql,
 * 	directory: new URL("./migrations/", import.meta.url)
 * })
 *
 * ```
 */
export function getPostgresMigratorOptions({
	sql,
	directory,
}: PostgresMigratorOptions): MigratorOptions<SqlDependency> {
	return {
		getRecords() {
			return getPostgresMigrations(sql as SqlDependency);
		},

		execute(def, direction) {
			return executePostgresMigration(def, direction, sql as SqlDependency);
		},

		async getDefinitions() {
			const migrations = [
				{ name: "000-bootstrap.js", ...postgresBootstrapMigration },
			];

			const files = await fs.readdir(directory, {
				withFileTypes: true,
			});

			for (const stat of files) {
				if (!stat.isFile()) continue;
				if (!migrationExtensions.has(path.extname(stat.name))) continue;

				migrations.push(await loadMigration(stat.name, directory));
			}

			return migrations.sort((a, b) => a.name.localeCompare(b.name));
		},
	};
}

/** @deprecated use {@link getPostgresMigratorOptions} */
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

/** @deprecated use {@link getPostgresMigrator} */
export const getNodePostgresMigrator = getPostgresMigrator;

//
// V2
//

/** @unstable */
export function getPostgres(sql: SqlDependency) {
	return new PostgresJsClient(sql);
}

/** @unstable */
export class PostgresJsClient implements PostgresClient {
	static json(value: any) {
		return new PostgresJson(value);
	}
	static prepare(value: any) {
		return new PostgresPrepared(value);
	}
	static clause(strings: TemplateStringsArray, ...values: PostgresValue[]) {
		return new PostgresClause(strings, values);
	}

	sql;
	constructor(sql: SqlDependency) {
		this.sql = sql;
	}

	execute<T>(
		strings: TemplateStringsArray,
		...values: PostgresValue[]
	): Promise<T[]> {
		return this.sql(strings, ...values.map((v) => _convert(this.sql, v)));
	}

	async transaction(): Promise<PostgresClient> {
		return new Promise((resolve1, reject1) => {
			this.sql
				.begin((trx) => {
					const pg = new PostgresJsClient(trx);
					const prom = new Promise<void>((r2) => {
						pg.dispose = async () => r2();
					});
					resolve1(pg);
					return prom;
				})
				.catch((err) => reject1(err));
		});
	}

	async dispose(): Promise<void> {
		await this.sql.end();
	}

	async [Symbol.asyncDispose]() {
		await this.dispose();
	}
}

function _convert(sql: SqlDependency, input: PostgresValue) {
	if (input instanceof PostgresJson) return sql.json(input);
	if (input instanceof PostgresPrepared) return sql(input);
	if (input instanceof PostgresClause) return sql(input);
	return input;
}
