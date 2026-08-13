import { Structure } from "../config/mod.ts";

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
	return ordering
		? Postgres.clause`ORDER BY ${Postgres.escape(ordering.column)} ${Postgres.escape(ordering.direction)}`
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

type TableColumns<T> = { [K in keyof T]: Structure<T[K]> };

export class Table<T> {
	name;
	columns;
	constructor(name: string, columns: TableColumns<T>) {
		this.name = name;
		this.columns = columns;
	}

	static define<T>(name: string, columns: TableColumns<T>) {
		return new Table(name, columns);
	}

	get columnNames(): (keyof T)[] {
		return Object.keys(this.columns) as any;
	}

	select(): SelectQuery<T, keyof T>;
	select<K extends keyof T = keyof T>(columns: K[]): SelectQuery<T, K>;
	select(columns?: any[]): SelectQuery<any, any> {
		return new SelectQuery(this.name, columns ?? this.columnNames);
	}

	update(): UpdateQuery<T> {
		return new UpdateQuery(this.name);
	}

	insert(): InsertQuery<T> {
		return new InsertQuery(this.name);
	}

	delete(): DeleteQuery<T> {
		return new DeleteQuery(this.name);
	}
}

export async function firstRecord<T>(promise: Promise<T[]>) {
	const [record = undefined] = await promise;
	return record;
}
