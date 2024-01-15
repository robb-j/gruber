// Adapted from the README.md

// Usage:
// deno run --allow-net --allow-read=migrations examples/deno/migrate.ts [up|down]

import postgres from "postgres";
import { DenoPostgresMigrator } from "../../deno/mod.ts";

async function runMigration(direction: string) {
	const sql = postgres("postgres://user:secret@127.0.0.1:/user");

	const migrator = new DenoPostgresMigrator(
		sql,
		new URL("./migrations/", import.meta.url),
	);
	let exitCode = 0;

	try {
		if (direction === "up") await migrator.up();
		else if (direction === "down") await migrator.down();
		else throw new Error("Unknown command, use <up|down>");
	} catch (error) {
		console.log("Fatal error", error);
		exitCode = 1;
	} finally {
		await sql.end();
	}
	Deno.exit(exitCode);
}

runMigration(Deno.args[0]);
