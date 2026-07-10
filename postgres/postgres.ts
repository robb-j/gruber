import type { SqlDependency } from "../core/types.ts";

// export type PostgresPrepared = { type: "prepared"; value: unknown };
// export type PostgresJson = { type: "json"; value: unknown };

/** @unstable */
export class PostgresPrepared {
	raw;
	constructor(raw: any) {
		this.raw = raw;
	}
}

/** @unstable */
export class PostgresJson {
	json;
	constructor(json: any) {
		this.json = json;
	}
}

/** @unstable */
export type PostgresValue =
	| string
	| number
	| Date
	| URL
	| PostgresPrepared
	| PostgresJson;

/** @unstable */
export interface PostgresUtility {
	prepare(value: any): PostgresPrepared;
	json(value: any): PostgresJson;
}

/** @unstable */
export interface Postgres extends AsyncDisposable {
	/**
		Start a transaction
		*/
	transaction(): Promise<Postgres>;

	/**
		Run an SQL query from js template tags
	*/
	execute<T>(
		strings: TemplateStringsArray,
		...values: PostgresValue[]
	): Promise<T[]>;

	/**
		Close this connection or transaction
	*/
	dispose(): Promise<void>;
}

/** @unstable */
export function getPostgresUtility(): PostgresUtility {
	return {
		prepare: (value) => new PostgresPrepared(value),
		json: (value) => new PostgresJson(value),
	};
}

// e.g.
// export const pg = getPostgresUtility()
//
// or
// export const useDatabase = loader(() => {
//   const sql = getPostgres(sql)
//   return Object.assign(sql, getPostgresUtility())
// })

/** @unstable */
export function getPostgres(sql: SqlDependency): Postgres {
	return {
		async transaction(): Promise<Postgres> {
			return new Promise((resolve1) => {
				sql.begin((trx) => {
					const pg = getPostgres(trx);
					const prom = new Promise<void>((resolve2) => {
						pg.dispose = async () => resolve2();
					});
					resolve1(pg);
					return prom;
				});
			});
		},
		async execute<T>(
			strings: TemplateStringsArray,
			...values: PostgresValue[]
		): Promise<T[]> {
			return sql(strings, _mapPostgresValues(values, sql));
		},
		async dispose(): Promise<void> {
			await sql.end();
		},
		async [Symbol.asyncDispose]() {
			await this.dispose();
		},
	};
}

/** @unstable */
function _mapPostgresValues(input: PostgresValue[], sql: SqlDependency) {
	return input.map((value) => {
		if (value instanceof PostgresPrepared) return sql(value.raw);
		if (value instanceof PostgresJson) return sql.json(value.json);
		return value;
	});
}

// --- v2

/** @unstable */
export interface PostgresOptions extends SqlDependency {}

/** @unstable */
export class Postgres2 {
	#options;
	constructor(options: PostgresOptions) {
		this.#options = options;
	}

	static prepare(value: any) {
		return new PostgresPrepared(value);
	}

	static json(value: any) {
		return new PostgresJson(value);
	}

	async transaction(): Promise<Postgres2> {
		return new Promise((resolve1) => {
			this.#options.begin((trx) => {
				const pg = new Postgres2(trx);
				const prom = new Promise<void>((resolve2) => {
					pg.dispose = async () => resolve2();
				});
				resolve1(pg);
				return prom;
			});
		});
	}

	async execute<T>(
		strings: TemplateStringsArray,
		...values: PostgresValue[]
	): Promise<T[]> {
		return this.#options(strings, _mapPostgresValues(values, this.#options));
	}

	async dispose() {
		await this.#options.end();
	}

	async [Symbol.asyncDispose]() {
		await this.dispose();
	}
}
