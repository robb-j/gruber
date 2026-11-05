import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
	_stripMigrationExtension,
	loadMigration,
	type MigrationDefinition,
} from "./mod.ts";

const extension = new Set([".js", ".ts", ".mjs", ".mts"]);

//
// Maybe a nicer API:
//
/*
	const defs = await loadDirectory(
		new URL("./migrations/", import.meta.main),
		Structure.object({
			up: Structure.fn(),
			down: Structure.fn(),
		}),
		{
			extensions: [".js", ".ts"],
		},
	);
*/

/**
 * @unstable
 *
 * Load migrations in a directory
 *
 * ```js
 * const definitions = await loadMigrationDirectory(
 *   new URL("./migrations/", import.meta.url)
 * )
 * ```
 */
export async function loadMigrationDirectory<T>(directory: URL | string) {
	const base = directory instanceof URL ? directory : pathToFileURL(directory);

	// Ensure a directory-like URL
	if (!base.pathname.endsWith("/")) {
		throw new TypeError("directory must end with /");
	}

	const result: MigrationDefinition<T>[] = [];
	const counts = new Map<string, number>();

	// Iterate through the entries in the directory, skipping non-files
	for (const stat of await fs.readdir(base, { withFileTypes: true })) {
		if (!stat.isFile() || !extension.has(path.extname(stat.name))) continue;

		// Load and parse the migration
		result.push(await loadMigration(stat.name, base));

		// Start tracking duplicates
		counts.set(
			_stripMigrationExtension(stat.name),
			(counts.get(_stripMigrationExtension(stat.name)) ?? 0) + 1,
		);
	}

	// throw an error if duplicates exist with different extensions
	if (Array.from(counts.values()).some((v) => v > 1)) {
		throw new TypeError("duplicate migrations found");
	}

	return result;
}
