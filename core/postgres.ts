import type { Sql } from "postgres";
import {
	defineMigration,
	MigrateDirection,
	MigrationDefinition,
	MigrationOptions,
	MigrationRecord,
} from "./migrator.ts";

export async function getPostgresMigrations(
	sql: Sql,
): Promise<MigrationRecord[]> {
	try {
		const rows = await sql`
      SELECT name, created
      FROM migrations
    `;
		return rows.map(({ name }) => ({ name }));
	} catch {
		return [];
	}
}

export function executePostgresMigration(
	def: MigrationDefinition<Sql>,
	direction: MigrateDirection,
	sql: Sql,
): Promise<void> {
	return sql.begin(async (sql) => {
		console.log("migrate %s", direction, def.name);

		if (direction === "up") {
			await def.up(sql);

			await sql`
				INSERT INTO migrations (name) VALUES (${def.name})
			`;
			return;
		}

		if (direction === "down") {
			await def.down(sql);

			if (def.down !== postgresBootstrapMigration.down) {
				await sql`
					DELETE FROM migrations WHERE name = ${def.name}
				`;
			}
			return;
		}

		throw new TypeError(`Invalid direction: ${direction}`);
	});
}

export const postgresBootstrapMigration = defineMigration<Sql>({
	async up(sql) {
		await sql`
			CREATE TABLE "migrations" (
				"name" varchar(255) PRIMARY KEY,
				"created" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
			)
		`;
	},
	async down(sql) {
		await sql`
			DROP TABLE "migrations"
		`;
	},
});

/** @deprecated use `postgresBootstrapMigration` */
export const bootstrapMigration = postgresBootstrapMigration;

export function definePostgresMigration(
	options: MigrationOptions<Sql>,
): MigrationOptions<Sql> {
	return defineMigration(options);
}
