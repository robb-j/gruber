import {
	type MigrationDefinition,
	type Store,
	type StoreSetOptions,
} from "../core/mod.ts";
import { type PostgresService } from "./postgres-service.ts";

/** @unstable */
export interface PostgresStoreValue {
	key: string;
	value: any;
	expiry: Date | null;
}

export interface PostgresStoreOptions {
	tableName?: string;
}

/** @unstable */
export class PostgresStore implements Store {
	get tableName() {
		return this.options.tableName;
	}

	static getMigration(tableName: string): MigrationDefinition<any> {
		return {
			name: "00-postgres-store",
			up: async (sql) => {
				await sql`
					CREATE TABLE ${tableName} {
						"key" VARCHAR(255) PRIMARY KEY,
						"value" JSONB NOT NULL,
						"expiry" TIMESTAMP DEFAULT NULL
					}
				`;
			},
			down: async (sql) => {
				await sql`
					DROP TABLE ${tableName}
				`;
			},
		};
	}

	sql: PostgresService;
	options: Required<PostgresStoreOptions>;
	constructor(sql: PostgresService, options: PostgresStoreOptions = {}) {
		this.sql = sql;
		this.options = {
			tableName: options.tableName ?? "cache",
		};
	}

	async dispose(): Promise<void> {}

	async [Symbol.asyncDispose](): Promise<void> {}

	async get<T>(key: string): Promise<T | undefined> {
		const [record = null] = await this.sql.execute<PostgresStoreValue>`
			SELECT name, key, expiry
			FROM ${this.tableName}
			WHERE key = ${key}
		`;
		if (record?.expiry && record.expiry.getTime() < Date.now()) {
			this.delete(key);
		}
		return record?.value;
	}

	async set<T>(
		key: string,
		value: T,
		options: StoreSetOptions = {},
	): Promise<void> {
		const record: PostgresStoreValue = { key, value, expiry: null };

		if (options.maxAge) {
			record.expiry = new Date(Date.now() + options.maxAge);
		}

		await this.sql.execute`
			INSERT INTO ${this.tableName} ${this.sql.prepare(record)}
			ON CONFLICT (key) DO UPDATE
				SET value = EXCLUDED.value, expiry = EXCLUDED.expiry;
		`;
	}

	async delete(key: string): Promise<void> {
		await this.sql.execute`
			DELETE FROM ${this.tableName} WHERE key = ${key}
		`;
	}

	async close(): Promise<void> {}
}
