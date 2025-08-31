// Adapted from the README.md

// Usage:
// deno run --allow-net --allow-read=examples/deno/migrations examples/deno/migrate.ts [up|down]

import postgres from "npm:postgres@^3.4.7";
import { getPostgresMigrator } from "../../bundle/deno/mod.ts";

async function runMigration(direction: string) {
	let exitCode = 0;

	const sql = postgres("postgres://user:secret@127.0.0.1:/user");
	const directory = new URL("./migrations/", import.meta.url);

	const migrator = getPostgresMigrator({ sql, directory });

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
