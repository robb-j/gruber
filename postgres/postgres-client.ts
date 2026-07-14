import type { SqlDependency } from "../core/types.ts";

export interface PostgresOptions {
	url: URL;
}

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
export class PostgresClause {
	strings;
	values;
	constructor(strings: TemplateStringsArray, values: PostgresValue[]) {
		this.strings = strings;
		this.values = values;
	}
}

/** @unstable */
export interface PostgresUtility {
	prepare(value: any): PostgresPrepared;
	json(value: any): PostgresJson;
	clause(strings: TemplateStringsArray, ...values: any): PostgresClause;
}

export type PostgresValue =
	| string
	| number
	| boolean
	| Date
	| URL
	| PostgresPrepared
	| PostgresJson
	| PostgresClause;

export interface PostgresClient extends AsyncDisposable {
	execute<T>(
		strings: TemplateStringsArray,
		...values: PostgresValue[]
	): Promise<T[]>;

	transaction(): Promise<PostgresClient>;

	dispose(): Promise<void>;
}

/** @unstable */
export function getPostgresUtility(): PostgresUtility {
	return {
		prepare: (value) => new PostgresPrepared(value),
		json: (value) => new PostgresJson(value),
		clause: (strings, ...values) => new PostgresClause(strings, values),
	};
}

export const Postgres = getPostgresUtility();
