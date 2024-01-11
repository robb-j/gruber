/**
 * @template [T=unknown]
 * @typedef {object} MigrationOptions
 * @property {(value: T) => void | Promise<void>} up
 * @property {(value: T) => void | Promise<void>} down
 */

/**
 * @template [T=unknown]
 * @typedef {object} MigrationDefinition
 * @property {(value: T) => void | Promise<void>} up
 * @property {(value: T) => void | Promise<void>} down
 */

/**
 * @template T @param {MigrationOptions<T>} options
 * @returns {MigrationDefinition<T>}
 */
export function defineMigration(options) {
	return {
		up: options.up,
		down: options.down,
	};
}

/**
 * @template T
 * @typedef {object} MigratorOptions
 * @property {() => Promise<MigrationDefinition<T>[]>} getMigrations
 */

/** @template T */
export class Migrator {
	/** @param {MigratorOptions<T>} options */
	constructor(options) {
		this.options = options;
	}
}

/**
 * @typedef {object} PostgresMigratorOptions
 * @property {}
 */

export class PostgresMigrator extends Migrator {
	/** @returns {MigratorOptions<import('postgres').Sql} */
	static getOptions(pg) {
		return {
			async getMigrations() {},
		};
	}

	/**
	 *
	 * @param {string} migrationsDir
	 * @param {() => Promise<import('postgres').Sql>} getPostgres
	 */
	constructor(migrationsDir, getPostgres) {
		super();
		this.migrationsDir = migrationsDir;
		this.getPostgres = getPostgres;
	}

	// ...
}
