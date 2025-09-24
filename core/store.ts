import type { TimerService } from "./timers.ts";
import type { RedisDependency } from "./types.ts";

export interface StoreSetOptions {
	/** milliseconds */
	maxAge?: number;
}

/**
 * @group Store
 *
 * Store is an async abstraction around a key-value engine like Redis or a JavaScript Map
 * with extra features for storing things for set-durations
 *
 * Store implements Disposable so you can use Explicit Resource Management
 *
 * ```js
 * async function main() {
 *   await using store = new MemoryStore(…)
 *
 *   await store.set('users/geoff', …)
 * }
 * ```
 */
export interface Store {
	/**
	 * Retrieve the value from the store
	 *
	 * ```js
	 * const value = await store.get("users/geoff")
	 * ```
	 */
	get<T>(key: string): Promise<T | undefined>;

	/**
	 * Put a value into the store
	 *
	 * ```js
	 * await store.set(
	 *   'users/geoff',
	 *   { name: "Geoff Testington"},
	 * )
	 *
	 * // Store jess for 5 minutes
	 * await store.set(
	 *   "users/jess",
	 *   { name: "Jess Smith" },
	 *   { maxAge: 5 * 60 * 1_000 }
	 * )
	 * ```
	 */
	set<T>(key: string, value: T, options?: StoreSetOptions): Promise<void>;

	/**
	 * Remove a value from the store
	 *
	 * ```js
	 * await store.remove("users/geoff")
	 * ```
	 */
	delete(key: string): Promise<void>;

	/**
	 * Close the store
	 *
	 * ```js
	 * await store.dispose()
	 * ```
	 */
	dispose(): Promise<void>;
	[Symbol.asyncDispose](): Promise<void>;

	/** @deprecated use {@link dispose} */
	close(): Promise<void>;
}

/**
 * @group Store
 *
 * MemoryStore is a in-memory implementation of {@link Store} that puts values into a Map and uses timers to expire data.
 * It was mainly made for automated testing.
 *
 * ```js
 * const store = new MemoryStore()
 * ```
 */
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

	dispose(): Promise<void> {
		return Promise.resolve();
	}

	close(): Promise<void> {
		return this.dispose();
	}

	[Symbol.asyncDispose](): Promise<void> {
		return this.dispose();
	}
}

/**
 * @group Store
 * @unstable
 */
export interface RedisStoreOptions {
	prefix?: string;
}

/**
 * @group Store
 * @unstable
 */
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

	async dispose() {}

	async [Symbol.asyncDispose]() {}
}
