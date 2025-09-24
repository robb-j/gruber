import type { MaybePromise } from "./types.ts";

/**
 * @ignore
 *
 * Options for defining some sort of migration
 *
 * ```js
 * const options = {
 *   up(value) {},
 *   down(value) {},
 * }
 * ```
 */
export interface MigrationOptions<T = unknown> {
	up(value: T): MaybePromise<void>;
	down(value: T): MaybePromise<void>;
}

/**
 * @ignore
 *
 * A definition for a migration, it's basically a `MigrationOptions` with a unique name
 *
 * ```js
 * const migration = {
 *   name: '042-some-migration',
 *   up() {},
 *   down() {},
 * }
 * ```
 */
export interface MigrationDefinition<T = unknown> {
	name: string;
	up(value: T): MaybePromise<void>;
	down(value: T): MaybePromise<void>;
}

/**
 * @ignore
 *
 * A record of a migration that has been performed
 *
 * ```js
 * const record = { name: '042-some-migration' }
 * ```
 */
export interface MigrationRecord {
	name: string;
}

/**
 * @group Migrator
 *
 * Define a generic migration, this is a wrapper around creating a `MigrationOptions`
 * which within TypeScript means you can specify the `<T>` once, rather than for each action.
 *
 * ```js
 * const migration = defineMigration({
 *   up () {},
 *   down () {},
 * })
 * ```
 */
export function defineMigration<T>(
	options: MigrationOptions<T>,
): MigrationOptions<T> {
	return {
		up: options.up,
		down: options.down,
	};
}

export type MigrateDirection = "up" | "down";

/**
 * @group Migrator
 *
 * MigratorOptions lets your create your own migrator that performs migrations in different ways.
 * For instance you could create one that loads a JSON "migrations" file from the filesystem.
 */
export interface MigratorOptions<T> {
	/**
	 * Get or generate the all migration definitions
	 *
	 * ```js
	 * return { name: '001-something.js', up() {}, down() {} }
	 * ```
	 */
	getDefinitions(): Promise<MigrationDefinition<T>[]>;

	/**
	 * Query which migrations have already been performed
	 *
	 * ```js
	 * return [{ name: '001-something.js }]
	 * ```
	 */
	getRecords(): Promise<MigrationRecord[]>;

	/**
	 * Perform or reverse a migration and update any required state
	 */
	execute(
		def: MigrationDefinition<T>,
		direction: "up" | "down",
	): void | Promise<void>;
}

/**
 * @group Migrator
 *
 * Migrator provides methods for running a specific type of migrations.
 * The idea is that different platforms/integrations can create a migrator that
 * works with a specific feature they want to add migrations around, e.g. a Postgres database.
 *
 * ```js
 * async function getRecords() {}
 *
 * async function getDefinitions() {}
 *
 * async function execute() {}
 *
 * const migrator = new Migrator({ getRecords, getDefinitions, execute })
 * ```
 *
 * See [examples/node-fs-migrator](/examples/node-fs-migrator/node-fs-migrator.js)
 */
export class Migrator<T = unknown> {
	options: MigratorOptions<T>;
	constructor(options: MigratorOptions<T>) {
		this.options = options;
	}

	/**
	 * Run any pending "up" migrations
	 *
	 * > It would be cool to specify a number here so you could run just 1 but
	 * > I haven't needed this so it hasn't been properly designed yet
	 *
	 * ```js
	 * await migrator.up()
	 * ```
	 */
	async up() {
		for (const def of await this._getTodo("up")) {
			await this.options.execute(def, "up");
		}
	}

	/**
	 * Run any "down" migrations for migrations that have already been performed
	 *
	 * > It would be cool to specify a number here so you could run just 1 but
	 * > I haven't needed this so it hasn't been properly designed yet
	 *
	 * ```js
	 * await migrator.up()
	 * ```
	 */
	async down() {
		for (const def of await this._getTodo("down")) {
			await this.options.execute(def, "down");
		}
	}

	/**
	 * @internal
	 *
	 * Get a number of migrations that need to be performed in a specific direction
	 */
	async _getTodo(direction: MigrateDirection, count = -1) {
		const defs = await this.options.getDefinitions();
		const records = await this.options.getRecords();
		const ran = new Set(records.map((r) => r.name));

		return (direction === "up" ? defs : Array.from(defs).reverse())
			.filter((def) => ran.has(def.name) === (direction === "down"))
			.slice(0, count === -1 ? Infinity : count);
	}
}

/**
 * @group Migrator
 *
 * Attempt to load a migration from a file using `import`.
 *
 * It combines the `name` and `directory` to get a file path, attempts to `import`-it and convert the `default` export into a `MigrationDefinition`. You can also force the `<T>` parameter onto the definition.
 *
 * It will throw errors if the file does not exist or if the default export doesn't look like a `MigrationOptions`.
 *
 *
 * ```js
 * const migration = await loadMigration(
 *   '001-create-users.js',
 *   new URL('./migrations/', import.meta.url)
 * )
 *
 * migration.name // "001-create-users.js"
 * migration.up // function
 * migration.down // function
 * ```
 */
export async function loadMigration<T = unknown>(
	name: string,
	directory: string | URL,
): Promise<MigrationDefinition<T>> {
	const url = new URL(name, directory);

	const def = await import(url.toString());

	const up = def.default.up ?? def.up ?? null;
	if (up && typeof up !== "function") {
		throw new Error(`migration "${name}" - up is not a function`);
	}

	const down = def.default.down ?? def.down ?? null;
	if (down && typeof down !== "function") {
		throw new Error(`migration "${name}" - down is not a function`);
	}

	return { name, up, down };
}
