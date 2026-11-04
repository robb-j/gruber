---
layout: api.njk
eleventyNavigation:
  key: Postgres
  parent: Integrations
api:
  entrypoint: postgres/mod.ts
---

# Postgres

The Postgres module provides an abstraction over a postgres database connection
to make it easy to query the database and allow the connection to be swapped out during testing.

- **SQL based** — write queries with JavaScript template literals with automatic parameterization.
- **Testable** — easily swap out the client during testing and write tests with it
- **Typed** — Use the `Table` abstraction to build queries and type queries

There are two main parts of the module

- `PostgresClient` — the abstraction over a postgres connection
- `Table` — a strongly-typed query builder based on [Structures](/config#structure) definitions

```ts
import postgres from "postgres";
import { PostgresJsClient } from "gruber";

const db = new PostgresJsClient(
  postgres("postgres://user:secret@localhost:5432/database"),
);

// a record type to pass to the query
interface PersonRecord {
  id: number;
  created_at: Date;
  name: string;
}

// Fetch people from the database
const people = await db.execute<PersonRecord>`
  SELECT id, created_at, name
  FROM people
`;

// Fetch a specific record (returns the value or null)
const geoff = await db.execute<PersonRecord>`
  SELECT id, created_at, name
  FROM people
  WHERE id = ${7}
`.first();

// Run multiple queries in a transaction
await db.transaction(async (trx) => {
  await trx.execute` … `;
  await trx.execute` … `;
});

// You could instead use `await using db = new PostgresJsClient(…)`
await db.dispose();
```

You can use `Table` to define your tables using Structures and generate strongly-typed queries based on them.

```ts
import { Structure, Table } from "gruber";

// The type here is optional, but recommended for portability in larger code bases
export const Person = Table.define<PersonRecord>("people", {
  id: Structure.number(),
  created_at: Structure.date(),
  name: Structure.string(),
});

// list people created before 2nd feb 2022
const people = await Person.select()
  .where` created_at < ${new Date("2022-02-02")} `.run(db);

// Create Jess
const jess = await Person.insert()
  .values({ name: "Jess Smith" })
  .returning(["id", "created_at", "name"])
  .run(db)
  .first();

// Update Jess
await Person.update().set({ name: "Jessie Smith" }).where` id = ${jess.id} `
  .returning(["id", "created_at", "name"])
  .run(db);

// Delete Jess
await Person.delete().where` id = ${jess.id} `.run(db);
```
