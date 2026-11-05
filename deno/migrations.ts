import {
	_stripMigrationExtension,
	loadMigration,
	type MigrationDefinition,
} from "./mod.ts";
import { extname, resolve, toFileUrl } from "./deps.ts";

const extension = new Set([".js", ".ts", ".mjs", ".mts"]);

/**
 * Convert a path to a file URL, keeping any trailing slash
 * (which `resolve` would otherwise remove)
 */
function pathToFileUrl(directory: string) {
	const url = toFileUrl(resolve(directory));
	if (/[\\/]$/.test(directory)) url.pathname += "/";
	return url;
}

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
	const base = directory instanceof URL ? directory : pathToFileUrl(directory);

	// Ensure a directory-like URL
	if (!base.pathname.endsWith("/")) {
		throw new TypeError("directory must end with /");
	}

	const result: MigrationDefinition<T>[] = [];
	const counts = new Map<string, number>();

	// Iterate through the entries in the directory, skipping non-files
	for await (const stat of Deno.readDir(base)) {
		if (!stat.isFile || !extension.has(extname(stat.name))) continue;

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
