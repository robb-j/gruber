/**
 * @template [T=unknown]
 * @typedef {object} MigrationOptions
 * @property {(value: T) => void | Promise<void>} up
 * @property {(value: T) => void | Promise<void>} down
 */

/**
 * @template [T=unknown]
 * @typedef {object} MigrationDefinition
 * @property {string} name
 * @property {(value: T) => void | Promise<void>} up
 * @property {(value: T) => void | Promise<void>} down
 */

/**
 * @typedef {object} MigrationRecord
 * @property {string} name
 */

/**
 * @template T @param {MigrationOptions<T>} options
 * @returns {MigrationOptions<T>}
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
 * @property {() => Promise<MigrationDefinition<T>[]>} getDefinitions
 * @property {() => Promise<MigrationRecord[]>} getRecords
 * @property {(def: MigrationDefinition<T>, direction: "up"|"down") => void | Promise<void>} execute
 */

/** @template T */
export class Migrator {
	/** @param {MigratorOptions<T>} options */
	constructor(options) {
		this.options = options;
	}

	async up() {
		for (const def of await this._getTodo("up", -1)) {
			await this.options.execute(def, "up");
		}
	}

	async down() {
		for (const def of await this._getTodo("down", -1)) {
			await this.options.execute(def, "down");
		}
	}

	async _getTodo(direction, count) {
		const defs = await this.options.getDefinitions();
		const records = await this.options.getRecords();
		const ran = new Set(records.map((r) => r.name));

		return (direction === "up" ? defs : Array.from(defs).reverse())
			.filter((def) => ran.has(def.name) === (direction === "down"))
			.slice(0, count === -1 ? Infinity : count);
	}
}
