import { Structure } from "../config/mod.ts";
import { Postgres2 } from "./postgres.ts";

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

export class Table<T> {
	#options;
	constructor(options: TableOptions<T>) {
		this.#options = options;
	}

	async select(pg: Postgres2, where?: any): Promise<T[]> {
		return pg.execute<T>`
			SELECT * FROM ${Postgres2.prepare(this.#options.name)}
			WHERE ${where}
		`;
	}
}

// --- examples ---

interface _Users {
	id: number;
	created_at: Date;
	name: string;
	email: string;
}

const _Users = new Table<_Users>({
	name: "users",
	columns: {
		id: Structure.number(),
		created_at: Structure.date(),
		name: Structure.string(),
		email: Structure.string(),
	},
});

const _users = await _Users.select({} as any);
