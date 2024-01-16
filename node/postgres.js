import fs from "node:fs/promises";
import path from "node:path";

import { Migrator } from "../core/migrator.js";
import { postgresOptions, bootstrapMigration } from "../core/postgres.js";

/** @typedef {import("postgres").Sql} Sql */

const migrationExtensions = new Set([".ts", ".js"]);

export class NodePostgresMigrator extends Migrator {
	/**
		@param {Sql} sql
		@param {URL} directory
	*/
	constructor(sql, directory) {
		super({
			...postgresOptions(sql),
			getDefinitions: () => this.getDefinitions(),
		});
		this.sql = sql;
		this.directory = directory;
		if (!this.directory.pathname.endsWith("/")) this.directory.pathname += "/";
	}

	async getDefinitions() {
		const migrations = [{ name: "000-bootstrap.js", ...bootstrapMigration }];

		const files = await fs.readdir(this.directory, {
			withFileTypes: true,
		});

		for (const stat of files) {
			const url = new URL(stat.name, this.directory);

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
	}
}
