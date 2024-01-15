import { type Sql } from "npm:postgres";
import { Migrator } from "../core/migrator.js";
import { postgresOptions, bootstrapMigration } from "../core/postgres.js";
import { extname } from "./deps.ts";

const migrationExtensions = new Set([".ts", ".js"]);

export class DenoPostgresMigrator extends Migrator<Sql> {
	directory: URL;
	sql: Sql;

	/**
	 * @param {Sql} sql
	 * @param {URL} directory
	 */
	constructor(sql: Sql, directory: URL) {
		super({
			...postgresOptions(sql),
			getDefinitions: () => this.getDefinitions(),
		});
		this.sql = sql;
		this.directory = directory;
		if (!this.directory.pathname.endsWith("/")) this.directory.pathname += "/";
	}

	async getDefinitions() {
		const migrations = [{ name: "000-bootstrap.ts", ...bootstrapMigration }];

		for await (const stat of Deno.readDir(this.directory)) {
			if (!stat.isFile) continue;
			if (!migrationExtensions.has(extname(stat.name))) continue;

			const url = new URL(stat.name, this.directory);

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
