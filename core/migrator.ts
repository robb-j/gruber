import type { MaybePromise } from "./types.ts";

export interface MigrationOptions<T = unknown> {
	up(value: T): MaybePromise<void>;
	down(value: T): MaybePromise<void>;
}

export interface MigrationDefinition<T = unknown> {
	name: string;
	up(value: T): MaybePromise<void>;
	down(value: T): MaybePromise<void>;
}

export interface MigrationRecord {
	name: string;
}

export function defineMigration<T>(
	options: MigrationOptions<T>,
): MigrationOptions<T> {
	return {
		up: options.up,
		down: options.down,
	};
}

export type MigrateDirection = "up" | "down";

export interface MigratorOptions<T> {
	getDefinitions(): Promise<MigrationDefinition<T>[]>;
	getRecords(): Promise<MigrationRecord[]>;
	execute(
		def: MigrationDefinition<T>,
		direction: "up" | "down",
	): void | Promise<void>;
}

export class Migrator<T = unknown> {
	options: MigratorOptions<T>;
	constructor(options: MigratorOptions<T>) {
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

	async _getTodo(direction: MigrateDirection, count = -1) {
		const defs = await this.options.getDefinitions();
		const records = await this.options.getRecords();
		const ran = new Set(records.map((r) => r.name));

		return (direction === "up" ? defs : Array.from(defs).reverse())
			.filter((def) => ran.has(def.name) === (direction === "down"))
			.slice(0, count === -1 ? Infinity : count);
	}
}

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
