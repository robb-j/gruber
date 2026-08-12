import type { SqlDependency } from "../core/mod.ts";
import {
	_prettyPostgresQuery,
	PostgresClause,
	PostgresEscaped,
	PostgresJson,
	QueryPromise,
	type PostgresClient,
	type PostgresValue,
} from "./postgres-client.ts";

/** @unstable */
export class PostgresJsClient implements PostgresClient {
	sql;
	constructor(sql: SqlDependency) {
		this.sql = sql;
	}

	execute<T>(
		strings: TemplateStringsArray,
		...values: PostgresValue[]
	): QueryPromise<T[]> {
		// console.debug?.("SQL", _prettyPostgresQuery([strings, ...values]));
		return QueryPromise.wrap(
			this.sql(strings, ...values.map((v) => _convert(this.sql, v))),
		);
	}

	async transaction(): Promise<PostgresClient> {
		return new Promise((resolve1, reject1) => {
			this.sql
				.begin((trx) => {
					const pg = new PostgresJsClient(trx);
					const prom = new Promise<void>((r2) => {
						pg.dispose = async () => r2();
					});
					resolve1(pg);
					return prom;
				})
				.catch((err) => reject1(err));
		});
	}

	async dispose(): Promise<void> {
		await this.sql.end();
	}

	async [Symbol.asyncDispose]() {
		await this.dispose();
	}
}

/**
 * Recursively convert Postgres values into postgres.js versions
 */
function _convert(sql: SqlDependency, input: PostgresValue): any {
	if (input instanceof PostgresJson) {
		return sql.json(input.json);
	}
	if (input instanceof PostgresEscaped) {
		return sql(_convert(sql, input.raw));
	}
	if (input instanceof PostgresClause) {
		return sql(
			input.strings as TemplateStringsArray,
			...input.values.map((v) => _convert(sql, v)),
		);
	}

	if (Array.isArray(input)) {
		return input.map((v) => _convert(sql, v));
	}
	if (input && typeof input === "object") {
		const cloned: any = {};
		for (const key in input) {
			cloned[key] = _convert(sql, (input as any)[key]);
		}
		return cloned;
	}
	return input;
}
