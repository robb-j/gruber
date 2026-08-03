import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { trimIndentation } from "../core/utilities.ts";
import { spy } from "../testing/mod.ts";
import {
	_prettyPostgresQuery,
	PostgresClause,
	PostgresEscaped,
	PostgresOrdering,
} from "./postgres-client.ts";
import {
	DeleteQuery,
	InsertQuery,
	SelectQuery,
	UpdateQuery,
} from "./tables.ts";

interface PetRecord {
	id: number;
	created: Date;
	name: string;
}

const columns: (keyof PetRecord)[] = ["id", "name", "created"];

describe("SelectQuery", () => {
	describe("constructor", () => {
		it("stores the table name", () => {
			const query = new SelectQuery("pets", []);
			assert.equal(query.tableName, "pets");
		});
		it("stores the columns", () => {
			const query = new SelectQuery<PetRecord>("pets", ["id", "name"]);
			assert.deepEqual(query.columns, ["id", "name"]);
		});
	});

	describe("where", () => {
		it("stores the clause", () => {
			const query = new SelectQuery<PetRecord>("pets", columns);
			query.where`id = ${42}`;
			assert.deepEqual(query.clause, new PostgresClause(["id = ", ""], [42]));
		});
		it("is chainable", () => {
			const query = new SelectQuery<PetRecord>("pets", columns);
			const result = query.where`id = ${42}`;
			assert.equal(query, result);
		});
	});

	describe("orderBy", () => {
		it("stores the ordering", () => {
			const query = new SelectQuery<PetRecord>("pets", columns);
			query.orderBy("name", "DESC");
			assert.deepEqual(query.ordering, new PostgresOrdering("name", "DESC"));
		});
		it("is chainable", () => {
			const query = new SelectQuery<PetRecord>("pets", columns);
			const result = query.orderBy("name", "DESC");
			assert.equal(query, result);
		});
	});

	describe("run", () => {
		it("performs a SELECT query", () => {
			const query = new SelectQuery<PetRecord>("pets", columns);
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			assert.equal(
				_prettyPostgresQuery(execute.uses[0]),
				trimIndentation`
					SELECT id, name, created
					FROM pets
				`,
			);
		});
		it("adds a WHERE clause", () => {
			const query = new SelectQuery<PetRecord>("pets", columns).where`id=${42}`;
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			assert.equal(
				_prettyPostgresQuery(execute.uses[0]),
				trimIndentation`
					SELECT id, name, created
					FROM pets
					WHERE id=42
				`,
			);
		});
		it("adds a ORDER BY clause", () => {
			const query = new SelectQuery<PetRecord>("pets", columns).orderBy(
				"name",
				"DESC",
			);
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			const [strings, ...values] = execute.uses[0];

			assert.equal(strings[0].trim(), "SELECT");
			assert.equal(strings[1].trim(), "FROM");

			assert.equal(values.length, 4);
			assert.deepEqual(values[0], new PostgresEscaped(columns));
			assert.deepEqual(values[1], new PostgresEscaped("pets"));
			assert.deepEqual(values[2], new PostgresClause([""], []));
			assert.deepEqual(
				values[3],
				new PostgresClause(
					["ORDER BY ", " ", ""],
					[new PostgresEscaped("name"), new PostgresEscaped("DESC")],
				),
			);

			assert.equal(
				_prettyPostgresQuery(execute.uses[0]),
				trimIndentation`
					SELECT id, name, created
					FROM pets

					ORDER BY name DESC
				`,
			);
		});
	});
});

describe("UpdateQuery", () => {
	describe("constructor", () => {
		it("stores the table name", () => {
			const query = new UpdateQuery("pets");
			assert.equal(query.tableName, "pets");
		});
	});

	describe("where", () => {
		it("stores the clause", () => {
			const query = new UpdateQuery("pets");
			query.where`id = ${42}`;
			assert.deepEqual(query.clause, new PostgresClause(["id = ", ""], [42]));
		});
		it("is chainable", () => {
			const query = new UpdateQuery("pets");
			const result = query.where`id = ${42}`;
			assert.equal(query, result);
		});
	});

	describe("set", () => {
		it("stores the values", () => {
			const query = new UpdateQuery<PetRecord>("pets");
			query.set({ name: "Geoff", created: new Date("2024-06-01") });
			assert.deepEqual(query.values, {
				name: "Geoff",
				created: new Date("2024-06-01"),
			});
		});
		it("is chainable", () => {
			const query = new UpdateQuery<PetRecord>("pets");
			const result = query.set({ name: "Geoff" });
			assert.equal(query, result);
		});
	});

	describe("returning", () => {
		it("stores the clause", () => {
			const query = new UpdateQuery<PetRecord>("pets");
			query.returning(["id", "name", "created"]);
			assert.deepEqual(query.columns, ["id", "name", "created"]);
		});
		it("is chainable", () => {
			const query = new UpdateQuery<PetRecord>("pets");
			const result = query.returning(["id", "name", "created"]);
			assert.equal(query, result);
		});
	});

	describe("run", () => {
		it("performs an UPDATE query", () => {
			const query = new UpdateQuery<PetRecord>("pets").set({ name: "Geoff" })
				.where`id = ${42}`;
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			assert.equal(
				_prettyPostgresQuery(execute.uses[0]),
				trimIndentation`
					UPDATE pets
					SET name='Geoff'
					WHERE id = 42
				`,
			);
		});
		it("adds a RETURNING clause", () => {
			const query = new UpdateQuery<PetRecord>("pets").set({ name: "Geoff" })
				.where`id = ${42}`.returning(["id", "name", "created"]);
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			assert.equal(
				_prettyPostgresQuery(execute.uses[0]),
				trimIndentation`
					UPDATE pets
					SET name='Geoff'
					WHERE id = 42
					RETURNING id, name, created
				`,
			);
		});
		it("throws with no query", async () => {
			const query = new UpdateQuery<PetRecord>("pets").set({ name: "Geoff" });
			assert.throws(() => query.run({} as any), /no clause/);
		});
		it("throws with no values", async () => {
			const query = new UpdateQuery<PetRecord>("pets").where`id = ${42}`;
			assert.throws(() => query.run({} as any), /no values/);
		});
	});
});

describe("InsertQuery", () => {
	describe("constructor", () => {
		it("stores the table name", () => {
			const query = new InsertQuery("pets");
			assert.equal(query.tableName, "pets");
		});
	});

	describe("values", () => {
		it("stores the values", () => {
			const query = new InsertQuery<PetRecord>("pets");
			query.values([{ name: "Timmmy" }, { name: "Jenny" }]);
			assert.deepEqual(query.records, [{ name: "Timmmy" }, { name: "Jenny" }]);
		});
		it("is chainable", () => {
			const query = new InsertQuery("pets");
			const result = query.values([{ name: "Timmmy" }, { name: "Jenny" }]);
			assert.equal(query, result);
		});
	});

	describe("returning", () => {
		it("stores the clause", () => {
			const query = new InsertQuery<PetRecord>("pets");
			query.returning(["id", "name", "created"]);
			assert.deepEqual(query.columns, ["id", "name", "created"]);
		});
		it("is chainable", () => {
			const query = new InsertQuery<PetRecord>("pets");
			const result = query.returning(["id", "name", "created"]);
			assert.equal(query, result);
		});
	});

	describe("run", () => {
		it("performs an UPDATE query", () => {
			const query = new InsertQuery<PetRecord>("pets").values([
				{ name: "Timmmy" },
				{ name: "Jenny" },
			]);
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			const [_strings, ...values] = execute.uses[0];
			const raw = _prettyPostgresQuery(execute.uses[0]);

			assert.match(raw, /^INSERT INTO pets$/m);
			assert.match(raw, /^VALUES /m);
			assert.deepEqual(values[0], new PostgresEscaped("pets"));
			assert.deepEqual(
				values[1],
				new PostgresEscaped([{ name: "Timmmy" }, { name: "Jenny" }]),
			);
		});
		it("adds a RETURNING clause", () => {
			const query = new InsertQuery<PetRecord>("pets")
				.values([{ name: "Timmmy" }, { name: "Jenny" }])
				.returning(["id", "created", "name"]);
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			const raw = _prettyPostgresQuery(execute.uses[0]);
			assert.match(raw, /^RETURNING id, created, name$/m);
		});
	});
});

describe("DeleteQuery", () => {
	describe("constructor", () => {
		it("stores the table name", () => {
			const query = new DeleteQuery<PetRecord>("pets");
			assert.equal(query.tableName, "pets");
		});
	});

	describe("where", () => {
		it("stores the clause", () => {
			const query = new DeleteQuery<PetRecord>("pets");
			query.where`id = ${42}`;
			assert.deepEqual(query.clause, new PostgresClause(["id = ", ""], [42]));
		});
		it("is chainable", () => {
			const query = new DeleteQuery<PetRecord>("pets");
			const result = query.where`id = ${42}`;
			assert.equal(query, result);
		});
	});

	describe("returning", () => {
		it("stores the clause", () => {
			const query = new DeleteQuery<PetRecord>("pets");
			query.returning(["id", "name", "created"]);
			assert.deepEqual(query.columns, ["id", "name", "created"]);
		});
		it("is chainable", () => {
			const query = new DeleteQuery<PetRecord>("pets");
			const result = query.returning(["id", "name", "created"]);
			assert.equal(query, result);
		});
	});

	describe("run", () => {
		it("performs an UPDATE query", () => {
			const query = new DeleteQuery<PetRecord>("pets").where`id = ${42}`;
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			assert.equal(
				_prettyPostgresQuery(execute.uses[0]),
				trimIndentation`
					DELETE FROM pets
					WHERE id = 42
				`,
			);
		});
		it("adds a RETURNING clause", () => {
			const query = new DeleteQuery<PetRecord>("pets")
				.where`id = ${42}`.returning(["id", "created", "name"]);
			const execute = spy(() => {});
			const sql: any = { execute };

			query.run(sql);

			assert.equal(
				_prettyPostgresQuery(execute.uses[0]),
				trimIndentation`
					DELETE FROM pets
					WHERE id = 42
					RETURNING id, created, name
				`,
			);
		});
		it("throws with no query", async () => {
			const query = new DeleteQuery<PetRecord>("pets");
			assert.throws(() => query.run({} as any), /no clause/);
		});
	});
});
