import { MigrationDefinition } from "./migrator.ts";
import { TimerService } from "./timers.ts";
import { RedisDependency, SqlDependency } from "./types.ts";

/** @unstable */
export interface StoreSetOptions {
	/** milliseconds */
	maxAge?: number;
}

/** @unstable */
export interface Store {
	get<T>(key: string): Promise<T | undefined>;
	set<T>(key: string, value: T, options?: StoreSetOptions): Promise<void>;
	delete(key: string): Promise<void>;
	close(): Promise<void>;
}

/** @unstable */
export class MemoryStore implements Store {
	values = new Map<string, any>();
	timeouts = new Map<string, number>();
	timers: TimerService;

	constructor(timers = globalThis) {
		this.timers = timers;
	}

	async get<T>(key: string): Promise<T | undefined> {
		return this.values.get(key);
	}

	async set<T>(
		key: string,
		value: T,
		options: StoreSetOptions = {},
	): Promise<void> {
		this.values.set(key, value);
		if (typeof options.maxAge === "number") {
			let timer = this.timeouts.get(key);
			if (timer) this.timers.clearTimeout(timer);

			timer = this.timers.setTimeout(() => {
				this.delete(key);
			}, options.maxAge);

			this.timeouts.set(key, timer);
		}
	}

	async delete<T>(key: string): Promise<void> {
		this.timeouts.delete(key);
		this.values.delete(key);
	}

	close(): Promise<void> {
		return Promise.resolve();
	}
}

/** @unstable */
export interface PostgresValue {
	key: string;
	value: any;
	expiry: Date | null;
}

/** @unstable */
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

	sql: SqlDependency;
	options: Required<PostgresStoreOptions>;
	constructor(sql: unknown, options: PostgresStoreOptions = {}) {
		this.sql = sql as SqlDependency;
		this.options = {
			tableName: options.tableName ?? "cache",
		};
	}

	async get<T>(key: string): Promise<T | undefined> {
		const [record = null] = await this.sql<PostgresValue[]>`
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
		const record: PostgresValue = { key, value, expiry: null };

		if (options.maxAge) {
			record.expiry = new Date(Date.now() + options.maxAge);
		}

		await this.sql`
			INSERT INTO ${this.tableName} ${this.sql(record)}
			ON CONFLICT (key) DO UPDATE
				SET value = EXCLUDED.value, expiry = EXCLUDED.expiry;
		`;
	}

	async delete(key: string): Promise<void> {
		await this.sql`
			DELETE FROM ${this.tableName} WHERE key = ${key}
		`;
	}

	async close(): Promise<void> {}
}

/** @unstable */
export interface RedisStoreOptions {
	prefix?: string;
}

/** @unstable */
export class RedisStore implements Store {
	redis: RedisDependency;
	prefix: string;
	constructor(redis: unknown, options: RedisStoreOptions = {}) {
		this.redis = redis as RedisDependency;
		this.prefix = options.prefix ?? "";
	}

	async get<T>(key: string): Promise<T | undefined> {
		const raw = await this.redis.get(this.prefix + key);
		return raw ? JSON.parse(raw) : undefined;
	}

	async set<T>(
		key: string,
		value: T,
		options: StoreSetOptions = {},
	): Promise<void> {
		const opts: Record<string, any> = {};
		if (options.maxAge) opts.PX = options.maxAge;
		await this.redis.set(this.prefix + key, JSON.stringify(value), opts);
	}

	async delete<T>(key: string): Promise<void> {
		await this.redis.del(this.prefix + key);
	}

	async close() {}
}
