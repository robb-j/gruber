import fs from "node:fs/promises";
import path from "node:path";

import { Structure } from "../config/mod.ts";
import type { PostgresClient } from "./postgres-client.ts";
import type { PostgresMigrationRecord } from "./postgres-migrator.ts";
import { Table } from "./tables.ts";
import { loadMigration, type MigrationDefinition } from "../core/mod.ts";

const MigrationTable = Table.define<PostgresMigrationRecord>("migrations", {
	name: Structure.string(),
	created: Structure.date(),
});

export interface PostgresMigratorOptions {
	verbose?: boolean;
}

export class PostgresMigrator {
	#postgres;
	#definitions;
	#options;
	constructor(
		postgres: PostgresClient,
		definitions: MigrationDefinition<PostgresClient>[],
		options: PostgresMigratorOptions = {},
	) {
		this.#postgres = postgres;
		this.#definitions = definitions;
		this.#options = options;
	}

	#debug(message: string, ...args: any[]) {
		if (!this.#options.verbose) return;
		console.debug("[postgres] " + message, ...args);
	}

	getDefinitions() {
		return this.#definitions;
	}

	getAppliedRecords() {
		return MigrationTable.select().run(this.#postgres);
	}

	findPending(applied: PostgresMigrationRecord[], n = Infinity) {
		const ran = new Set(applied.map((r) => r.name));

		return this.#definitions
			.filter((def) => !ran.has(def.name))
			.sort((a, b) => a.name.localeCompare(b.name))
			.slice(0, n);
	}

	async up(n = Infinity) {
		const pending = this.findPending(await this.getAppliedRecords(), n);

		for (const def of pending) {
			this.#debug("running", def.name);

			await using trx = await this.#postgres.transaction();
			await MigrationTable.insert().values({ name: def.name }).run(trx);
			await def.up(trx);
		}

		return pending.length;
	}

	findReversions(applied: PostgresMigrationRecord[], n = Infinity) {
		const ran = new Set(applied.map((r) => r.name));

		return this.#definitions
			.filter((def) => ran.has(def.name))
			.sort((a, b) => b.name.localeCompare(a.name))
			.slice(0, n);
	}

	async down(n = Infinity) {
		const reversions = this.findReversions(await this.getAppliedRecords(), n);

		for (const def of reversions) {
			this.#debug("running", def.name);

			await using trx = await this.#postgres.transaction();
			await MigrationTable.delete().where`name = ${def.name}`.run(trx);
			await def.down(trx);
		}

		return reversions.length;
	}
}

export interface PostgresMigratorRunOptions {
	dryRun?: boolean;
	count?: number;
}

export const bootstrapMigration: MigrationDefinition<PostgresClient> = {
	name: "000-bootstrap.ts",
	async up(sql) {
		await sql.execute`
      CREATE TABLE "migrations" (
        "name" varchar(255) PRIMARY KEY,
        "created" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
	},
	async down(sql) {
		await sql.execute`
      DROP TABLE "migrations"
    `;
	},
};

const migrationExtensions = new Set([".ts", ".js"]);

export async function loadMigrations(base: URL) {
	const defs = [bootstrapMigration];

	const matches = await fs.opendir(base);

	for await (const entry of matches) {
		if (!entry.isFile()) continue;
		if (!migrationExtensions.has(path.extname(entry.name))) continue;

		defs.push(await loadMigration(entry.name, base));
	}

	return defs;
}
