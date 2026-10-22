import { _isPlainObject, type SqlDependency } from "../core/mod.ts";
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
		return _execute(this.sql, strings, values);
	}

	transaction<T>(
		block: (trx: PostgresClient) => Promise<T> | T,
	): Promise<Awaited<T>> {
		return this.sql.begin((trx) => block(new PostgresJsTransaction(trx)));
	}

	async dispose(): Promise<void> {
		await this.sql.end();
	}

	async [Symbol.asyncDispose]() {
		await this.dispose();
	}
}

/**
 * @unstable
 *
 * A client scoped to a postgres.js transaction, created by
 * {@link PostgresJsClient#transaction}. It doesn't own the connection so it
 * can't be disposed and nested transactions aren't supported.
 */
export class PostgresJsTransaction implements PostgresClient {
	sql;
	constructor(sql: SqlDependency) {
		this.sql = sql;
	}

	execute<T>(
		strings: TemplateStringsArray,
		...values: PostgresValue[]
	): QueryPromise<T[]> {
		return _execute(this.sql, strings, values);
	}

	transaction<T>(): Promise<Awaited<T>> {
		return Promise.reject(new Error("nested transactions are not supported"));
	}

	async dispose(): Promise<void> {
		throw new Error("cannot dispose a transaction");
	}

	async [Symbol.asyncDispose]() {
		await this.dispose();
	}
}

function _execute<T>(
	sql: SqlDependency,
	strings: TemplateStringsArray,
	values: PostgresValue[],
): QueryPromise<T[]> {
	return QueryPromise.wrap(
		sql(strings, ...values.map((v) => _convert(sql, v))),
	);
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
	if (_isPlainObject(input)) {
		const cloned: any = {};
		for (const key in input) {
			cloned[key] = _convert(sql, (input as any)[key]);
		}
		return cloned;
	}
	return input;
}
