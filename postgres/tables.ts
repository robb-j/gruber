import { Structure } from "../config/mod.ts";

import {
	Postgres,
	PostgresClause,
	PostgresJson,
	type PostgresClient,
	type PostgresValue,
} from "./postgres-client.ts";

export interface TableOptions<T> {
	name: string;
	columns: {
		[K in keyof T]: Structure<T[K]>;
	};
}

// class Select<T> {
// 	table;
// 	columns;
// 	// whereStatement = null
// 	config = {
// 		where: null,
// 		order: null,
// 	};
// 	constructor(table: string, columns?: string) {
// 		this.table = table;
// 		this.columns = columns;
// 	}

// 	where(statement: any) {
// 		this.config.where = statement;
// 		return this;
// 	}

// 	orderBy(statement: any) {
// 		this.config.order = statement;
// 		return this;
// 	}
// }

interface PostgresQuery<T> {
	execute(postgres: PostgresClient): Promise<T>;
}

interface PostgresOrdering<T> {
	column: T;
	direction: "ASC" | "DESC";
}

export class Select<T, K extends keyof T> implements PostgresQuery<
	Pick<T, K>[]
> {
	#wheres: PostgresClause[] = [];
	#orders: PostgresOrdering<keyof T>[] = [];

	#tableName;
	#columns;
	constructor(tableName: string, columns: K[]) {
		this.#tableName = tableName;
		this.#columns = columns;
	}

	where(strings: TemplateStringsArray, ...values: PostgresValue[]) {
		this.#wheres.push(new PostgresClause(strings, values));
		return this;
	}

	orderBy(column: keyof T, direction: "ASC" | "DESC") {
		this.#orders.push({ column, direction });
		return this;
	}

	async execute(postgres: PostgresClient): Promise<Pick<T, K>[]> {
		throw new TypeError("not implemented");
	}
}

type Postgresify<T> = {
	[K in keyof T]: T[K] | PostgresJson;
};

type UpdateResult<T, K extends undefined | keyof T> = K extends keyof T
	? Pick<T, K>[]
	: undefined;

export class Update<T, K extends keyof T | undefined> implements PostgresQuery<
	UpdateResult<T, K>
> {
	#wheres: PostgresClause[] = [];
	#values: Partial<Postgresify<T>> = {};

	#tableName;
	#columns;
	constructor(tableName: string, columns: K[]) {
		this.#tableName = tableName;
		this.#columns = columns;
	}

	where(strings: TemplateStringsArray, ...values: PostgresValue[]) {
		this.#wheres.push(new PostgresClause(strings, values));
		return this;
	}

	set(values: Partial<Postgresify<T>>) {
		Object.assign(this.#values, values);
		return this;
	}

	returning<K extends keyof T>(columns: K[]) {
		const mutated = this as any as Update<T, K>;
		mutated.#columns = columns;
		return mutated;
	}

	async execute(postgres: PostgresClient): Promise<UpdateResult<T, K>> {
		throw new TypeError("not implemented");
	}
}

export class Table<T> {
	#options;
	constructor(options: TableOptions<T>) {
		this.#options = options;
	}

	get #tableName() {
		return this.#options.name;
	}
	get #columns() {
		return Object.keys(this.#options.columns) as (keyof T)[];
	}

	// async select(pg: PostgresClient, where?: PostgresClause): Promise<T[]> {
	// 	return pg.execute<T>`
	// 		SELECT * FROM ${Postgres.prepare(this.#options.name)}
	// 		${where ?? Postgres.clause``}
	// 	`;
	// }

	select<K extends keyof T>(columns?: K[]) {
		return columns
			? new Select<T, K>(this.#tableName, columns)
			: new Select<T, keyof T>(this.#tableName, this.#columns);
	}

	selectOne<K extends keyof T>(columns?: K[]) {
		throw new TypeError("not implemented");
	}

	update() {
		return new Update<T, never>(this.#tableName, []);
	}

	updateOne<K extends keyof T>(columns?: K[]) {
		throw new TypeError("not implemented");
	}
}

// --- examples ---

const postgres = {} as any;

// interface UserRecord {
// 	id: number;
// 	created_at: Date;
// 	name: string;
// 	email: string;
// }

const Users = new Table({
	name: "users",
	columns: {
		id: Structure.number(),
		created_at: Structure.date(),
		name: Structure.string(),
		email: Structure.string(),
	},
});

// prettier-ignore
Users
	.select(["id", "name", "email", "created_at"])
	.orderBy("created_at", "ASC")
	.execute(postgres);

// prettier-ignore
Users.update()
	.set({ name: "Timmy Simith" })
	.where`id = ${100}`
	.returning(['id', 'created_at', 'name', 'email'])
	.execute(postgres);

// const _users = await _Users.select({} as any);
