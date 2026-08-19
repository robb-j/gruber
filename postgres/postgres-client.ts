import { trimIndentation } from "../core/utilities.ts";

/**
 * @ignore
 *
 * A value being held for a postgres client to be escaped in the query
 */
export class PostgresEscaped {
	raw;
	constructor(raw: any) {
		this.raw = raw;
	}
}

/**
 * @ignore
 *
 * Holds a JSON object to be put into a postgres query
 */
export class PostgresJson {
	json;
	constructor(json: any) {
		this.json = json;
	}
}

/**
 * @ignore
 *
 * Holds a nested postgres query clause, e.g. for dynamically picking a WHERE statement
 */
export class PostgresClause {
	strings;
	values;
	constructor(
		strings: TemplateStringsArray | string[],
		values: PostgresValue[],
	) {
		this.strings = strings;
		this.values = values;
	}
}

export class PostgresOrdering {
	column;
	direction;
	constructor(column: string, direction: "ASC" | "DESC") {
		this.column = column;
		this.direction = direction;
	}
}

/**
 * @ignore The allowed types that can be used in a postgres string template
 */
export type PostgresValue =
	| string
	| number
	| boolean
	| Date
	| URL
	| null
	| undefined
	| PostgresEscaped
	| PostgresJson
	| PostgresClause;

/**
 * Something that manages a connection to a postgres database and performs queries & transactions
 *
 * ```js
 * const pg = {
 *   execute(strings, ...values) {},
 *   transaction() {},
 *   dispose() {},
 *   [Symbol.asyncDispose]() {}
 * }
 * ```
 */
export interface PostgresClient extends AsyncDisposable {
	execute<T>(
		strings: TemplateStringsArray,
		...values: PostgresValue[]
	): QueryPromise<T[]>;

	transaction(): Promise<PostgresClient>;

	dispose(): Promise<void>;
}

export const Postgres = {
	escape: (value: any) => new PostgresEscaped(value),
	json: (value: any) => new PostgresJson(value),
	clause: (s: TemplateStringsArray, ...v: any[]) => new PostgresClause(s, v),
};

function _prettyIdentifier(input: string) {
	return /\s/.test(input) ? JSON.stringify(input) : input;
}

function _prettyObject(input: any) {
	return Object.entries(input)
		.map((entry) => `${entry[0]}=${_prettyLiteral(entry[1])}`)
		.join(",");
}

function _prettyLiteral(input: any) {
	if (input === null) return "NULL";
	if (typeof input === "string") return `'${input}'`;
	if (typeof input === "number") return input;
	if (typeof input === "boolean") return input ? "TRUE" : "FALSE";
	throw new TypeError("unknown literal");
}

// NOTE: doesn't handle INSERT INTO VALUES properly
export function _prettyPostgresValue(value: PostgresValue): any {
	if (value instanceof PostgresEscaped) {
		if (Array.isArray(value.raw)) {
			return value.raw.map((v) => _prettyIdentifier(v)).join(", ");
		}
		if (value.raw && typeof value.raw === "object") {
			return _prettyObject(value.raw);
		}
		if (typeof value.raw === "string") return _prettyIdentifier(value.raw);
		return value.raw;
	}
	if (value instanceof PostgresClause) {
		return trimIndentation(
			value.strings,
			...value.values.map((v) => _prettyPostgresValue(v)),
		);
	}
	if (value instanceof PostgresJson) {
		return `'${JSON.stringify(value.json)}'`;
	}
	return value;
}

/**
 * Turn template-string arguments for postgres.exec into a well-formed object
 * that tests can rely on and assert against.
 *
 * Currently the naming convention is 1-indexed and the parameters are 0-indexed,
 * this makes sense for human-readability which the tests are intended for.
 */
export function _decomposePostgresQuery(
	[strings, ...values]: any[],
	startAt = 0,
) {
	let n = startAt;
	let query = "";
	let params: any[] = [];

	// Loop through each string-value pair
	for (let i = 0; i < strings.length; i++) {
		query += strings[i];

		// Check there is a matching value (there isn't at the end)
		const value = values[i];
		if (value === undefined) continue;

		// If the value is a clause, recursively process that
		if (value instanceof PostgresClause) {
			// Process the nested clause, starting continuing the parameter numbering
			const nested = _decomposePostgresQuery(
				[value.strings, ...value.values],
				n,
			);

			// Join the query, increment the parameter number and concat nested params
			query += nested.text;
			n += nested.params.length;
			params.push(...nested.params);
		} else {
			// Turn non-clauses into parameters using incremental variable names
			query += "$" + ++n;
			params.push(value);
		}
	}

	// Return the processed text (trimmed) and the associated parameters
	return {
		text: trimIndentation(query),
		params,
	};
}

export function _prettyPostgresQuery([strings, ...values]: any[]) {
	return trimIndentation(
		strings,
		...values.map((v) => _prettyPostgresValue(v)),
	);
}

// IDEA: could use a custom promise to get the "first" record which is often used
export class QueryPromise<T extends any[]> extends Promise<T> {
	static wrap<T extends any[]>(promise: Promise<T>) {
		return new QueryPromise((resolve, reject) => promise.then(resolve, reject));
	}

	first(): Promise<T[number] | null> {
		return this.then(([value]) => value);
	}
}
