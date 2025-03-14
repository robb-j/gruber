// Adapted from the README.md

// Usage:
// node examples/node/migrate.js [up|down]

import process from "node:process";
import postgres from "postgres";
import { getPostgresMigrator } from "gruber";

async function runMigration(direction) {
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
	process.exit(exitCode);
}

runMigration(process.argv[2]);
