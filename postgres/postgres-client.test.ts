import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	_decomposePostgresQuery,
	_prettyPostgresQuery,
	_prettyPostgresValue,
	Postgres,
	PostgresClause,
	PostgresEscaped,
	PostgresJson,
} from "./postgres-client.ts";
import { trimIndentation } from "../core/utilities.ts";

describe("_prettyPostgresValue", () => {
	it("formats escaped arrays", () => {
		const result = _prettyPostgresValue(
			new PostgresEscaped(["first", "second", "third"]),
		);
		assert.equal(result, "first, second, third");
	});
	it("formats identifiers", () => {
		const result = _prettyPostgresValue(new PostgresEscaped(["some text"]));
		assert.equal(result, '"some text"');
	});
	it("formats clauses", () => {
		const result = _prettyPostgresValue(
			new PostgresClause(["WHERE id = ", ""], [42]),
		);
		assert.equal(result, "WHERE id = 42");
	});
	it("formats json", () => {
		const result = _prettyPostgresValue(new PostgresJson({ age: 42 }));
		assert.equal(result, `'{"age":42}'`);
	});
});

function untemplate(strings: TemplateStringsArray, ...values: any) {
	return [strings, ...values];
}

describe("_prettyPostgresQuery", () => {
	it("formats select queries", () => {
		const orderBy = Postgres.clause`ORDER BY ${Postgres.escape("name")} DESC`;

		const result = _prettyPostgresQuery(
			untemplate`
				SELECT ${new PostgresEscaped(["id", "name", "created"])}
				FROM ${new PostgresEscaped("pets")}
				WHERE id = ${42}
				${orderBy}
			`,
		);

		assert.equal(
			result,
			trimIndentation`
				SELECT id, name, created
				FROM pets
				WHERE id = 42
				ORDER BY name DESC
			`,
		);
	});
});

describe("_decomposePostgresQuery", () => {
	it("replaces parameters with placeholders", () => {
		const result = _decomposePostgresQuery(
			untemplate`
				SELECT * FROM ${Postgres.escape("users")}
				WHERE id = ${1}
			`,
		);

		assert.equal(
			result.text,
			trimIndentation`
				SELECT * FROM $1
				WHERE id = $2
			`,
		);
		assert.deepEqual(result.params, [Postgres.escape("users"), 1]);
	});
	it("expands nested clauses", () => {
		const result = _decomposePostgresQuery(
			untemplate`
				SELECT * FROM users
				${Postgres.clause`WHERE id = ${1}`}
			`,
		);

		assert.equal(
			result.text,
			trimIndentation`
				SELECT * FROM users
				WHERE id = $1
			`,
		);
		assert.deepEqual(result.params, [1]);
	});
	it("expands recursive nested clauses", () => {
		const result = _decomposePostgresQuery(
			untemplate`
				SELECT * FROM users
				${Postgres.clause`${Postgres.clause`WHERE id = ${1}`}`}
			`,
		);

		assert.equal(
			result.text,
			trimIndentation`
				SELECT * FROM users
				WHERE id = $1
			`,
		);
		assert.deepEqual(result.params, [1]);
	});
});
