// Adapted from the README.md

// Usage:
// node examples/node/migrate.js [up|down]

import process from "node:process";
import postgres from "postgres";
import { NodePostgresMigrator } from "gruber/mod.js";

async function runMigration(direction) {
	const sql = postgres("postgres://user:secret@127.0.0.1:/user");

	const migrator = new NodePostgresMigrator(
		sql,
		new URL("./migrations/", import.meta.url),
	);

	try {
		if (direction === "up") await migrator.up();
		else if (direction === "down") await migrator.down();
		else throw new Error("Unknown command, use <up|down>");
	} catch (error) {
		console.log("Fatal error", error);
		process.exitCode = 1;
	} finally {
		await sql.end();
	}
}

runMigration(process.argv[2]);
