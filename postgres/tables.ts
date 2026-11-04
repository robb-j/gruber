import { Structure } from "../config/mod.ts";
import { pickProperties } from "../core/utilities.ts";

import {
	Postgres,
	PostgresClause,
	PostgresJson,
	PostgresOrdering,
	QueryPromise,
	type PostgresClient,
	type PostgresValue,
} from "./postgres-client.ts";

export interface PostgresQuery<T> {
	run(sql: PostgresClient): QueryPromise<T[]>;
}

function _orderBy(ordering?: PostgresOrdering) {
	const dir =
		ordering?.direction === "ASC"
			? Postgres.clause`ASC`
			: Postgres.clause`DESC`;
	return ordering
		? Postgres.clause`ORDER BY ${Postgres.escape(ordering.column)} ${dir}`
		: Postgres.clause``;
}

function _where(clause?: PostgresClause) {
	return clause ? Postgres.clause`WHERE ${clause}` : Postgres.clause``;
}

function _returning(columns?: any[]) {
	return columns && columns.length > 0
		? Postgres.clause`RETURNING ${Postgres.escape(columns)}`
		: Postgres.clause``;
}

/**
 * @internal
 */
export class SelectQuery<
	T,
	K extends keyof T = keyof T,
> implements PostgresQuery<Pick<T, K>> {
	tableName;
	columns;
	constructor(tableName: string, columns: K[]) {
		this.tableName = tableName;
		this.columns = columns;
	}

	clause?: PostgresClause;
	where(strings: TemplateStringsArray, ...values: PostgresValue[]) {
		this.clause = new PostgresClause(strings, values);
		return this;
	}

	ordering?: PostgresOrdering;
	orderBy(column: keyof T, direction: "ASC" | "DESC") {
		this.ordering = new PostgresOrdering(column as string, direction);
		return this;
	}

	run(sql: PostgresClient): QueryPromise<Pick<T, K>[]> {
		return sql.execute`
			SELECT ${Postgres.escape(this.columns)}
			FROM ${Postgres.escape(this.tableName)}
			${_where(this.clause)}
			${_orderBy(this.ordering)}
		`;
	}
}

// NOTE: postgres doesn't support ORDER BY for updates

/** @internal */
export class UpdateQuery<T, K extends keyof T = any> implements PostgresQuery<
	Pick<T, K>
> {
	tableName;
	constructor(tableName: string) {
		this.tableName = tableName;
	}

	clause?: PostgresClause;
	where(strings: TemplateStringsArray, ...values: PostgresValue[]) {
		this.clause = new PostgresClause(strings, values);
		return this;
	}

	values: PostgresInsert<T> = {} as any;
	set(values: PostgresInsert<T>) {
		Object.assign(this.values, values);
		return this;
	}

	columns: K[] = [];
	returning<L extends keyof T>(columns: L[]) {
		const newThis = this as any as UpdateQuery<T, L>;
		newThis.columns = columns;
		return newThis;
	}

	run(sql: PostgresClient) {
		if (!this.clause) throw new TypeError("no clause");
		if (Object.keys(this.values).length === 0) throw new TypeError("no values");

		return sql.execute<Pick<T, K>>`
			UPDATE ${Postgres.escape(this.tableName)}
			SET ${Postgres.escape(this.values)}
			${_where(this.clause)}
			${_returning(this.columns)}
		`;
	}
}

export type PostgresInsert<T> = {
	[K in keyof T]?: T[K] | PostgresJson | undefined;
};

/** @internal */
export class InsertQuery<T, K extends keyof T = any> implements PostgresQuery<
	Pick<T, K>
> {
	tableName;
	constructor(tableName: string) {
		this.tableName = tableName;
	}

	records: PostgresInsert<T>[] = [];
	values(records: PostgresInsert<T> | PostgresInsert<T>[]) {
		this.records = Array.isArray(records) ? records : [records];
		return this;
	}

	columns: K[] = [];
	returning<L extends keyof T>(columns: L[]) {
		const newThis = this as any as InsertQuery<T, L>;
		newThis.columns = columns;
		return newThis;
	}

	run(sql: PostgresClient) {
		return sql.execute<Pick<T, K>>`
			INSERT INTO ${Postgres.escape(this.tableName)}
			${Postgres.escape(this.records)}
			${_returning(this.columns)}
		`;
	}
}

/** @internal */
export class DeleteQuery<T, K extends keyof T = any> implements PostgresQuery<
	Pick<T, K>
> {
	tableName;
	constructor(tableName: string) {
		this.tableName = tableName;
	}

	clause?: PostgresClause;
	where(strings: TemplateStringsArray, ...values: PostgresValue[]) {
		this.clause = new PostgresClause(strings, values);
		return this;
	}

	columns: K[] = [];
	returning<L extends keyof T>(columns: L[]) {
		const newThis = this as any as DeleteQuery<T, L>;
		newThis.columns = columns;
		return newThis;
	}

	run(sql: PostgresClient) {
		if (!this.clause) throw new TypeError("no clause");

		return sql.execute<Pick<T, K>>`
			DELETE FROM ${Postgres.escape(this.tableName)}
			WHERE ${this.clause}
			${_returning(this.columns)}
		`;
	}
}

/** Turn a type into record of structures to validate it */
export type TableColumns<T> = { [K in keyof T]: Structure<T[K]> };

/**
 * A declarative definition for a table that you can use to build queries with
 * and query strongly-typed values from the database with.
 */
export class Table<T> {
	get name() {
		return this.#name;
	}

	#name;
	#columns;
	constructor(name: string, columns: TableColumns<T>) {
		this.#name = name;
		this.#columns = columns;
	}

	/**
	 * A helper to define a table without using the constructor
	 *
	 * ```js
	 * const People = Table.define("people", {
	 *   id: Structure.number(),
	 *   created_at: Structure.date(),
	 *   name: Structure.string(),
	 * })
	 * ```
	 */
	static define<T>(name: string, columns: TableColumns<T>) {
		return new Table(name, columns);
	}

	get columnNames(): (keyof T)[] {
		return Object.keys(this.#columns) as any;
	}

	/**
	 * Build an SQL `SELECT` query with optional clauses
	 *
	 * ```js
	 * const query = People.select([ 'id', 'created_at', 'name' ])
	 *   .where` id = ${7} `
	 *   .orderBy('id', 'DESC')
	 *   .run(postgres)
	 * ```
	 */
	select(): SelectQuery<T, keyof T>;
	select<K extends keyof T = keyof T>(columns: K[]): SelectQuery<T, K>;
	select(columns: any[] = this.columnNames): SelectQuery<any, any> {
		return new SelectQuery(this.#name, columns);
	}

	/**
	 * Build an SQL `UPDATE` query with optional clauses
	 *
	 * ```js
	 * const query = People.update()
	 *   .set({ name: "Geoff Testington" })
	 *   .where` id = ${7} `
	 *   .returning(['id', 'created_at', 'name'])
	 *   .run()
	 * ```
	 */
	update(): UpdateQuery<T> {
		return new UpdateQuery(this.#name);
	}

	/**
	 * Build an SQL `INSERT` query with optional clauses
	 *
	 * ```js
	 * const query = People.insert()
	 *   .values({ name: "Jess Smith" })
	 *   .returning(['id', 'created_at', 'name'])
	 *   .run(postgres)
	 * ```
	 */
	insert(): InsertQuery<T> {
		return new InsertQuery(this.#name);
	}

	/**
	 * Build an SQL `INSERT` query with optional clauses
	 *
	 * ```js
	 * const query = People.delete()
	 *   .where` id = ${7} `
	 *   .run(postgres)
	 * ```
	 */
	delete(): DeleteQuery<T> {
		return new DeleteQuery(this.#name);
	}

	/**
	 * Get a subset of the column structures, useful for creating structures for validation
	 */
	properties(): TableColumns<T>;
	properties<K extends keyof T>(names: K[]): TableColumns<Pick<T, K>>;
	properties(names = this.columnNames) {
		return pickProperties(this.#columns, names);
	}
}
