---
layout: api.njk
eleventyNavigation:
  key: Postgres
  parent: Integrations
api:
  entrypoint: postgres/mod.ts
---

# Postgres

The Postgres module provides an abstraction over postgres called `PostgresClient` along with utilities to integrate it with other Gruber modules.

There are methods like `getPostgresMigrations`, `executePostgresMigration` and `postgresBootstrapMigration` to help platforms like Deno and Node.js implement a [Migrator](/core/#migrator).

`PostgresMigrator` runs migrations directly against a `PostgresClient`.
It records each migration by its full name, e.g. `001-add-users.js`, but ignores file extensions when checking which migrations have run.

---

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

const postgres = new PostgresJsClient(
  postgres("postgres://user:secret@localhost:5432/database"),
);

// a record type to pass to the query
interface PersonRecord {
  id: number;
  created_at: Date;
  name: string;
}

// Fetch people from the database
const people = await postgres.execute<PersonRecord>`
  SELECT id, created_at, name
  FROM people
`;

// Fetch a specific record (returns the value or null)
const geoff = await postgres.execute<PersonRecord>`
  SELECT id, created_at, name
  FROM people
  WHERE id = ${7}
`.first();

// Run multiple queries in a transaction
await postgres.transaction(async (trx) => {
  await trx.execute` … `;
  await trx.execute` … `;
});

// You could instead use `using postgres = new PostgresJsClient(…)`
await postgres.dispose();
```

You can use `Table` to define your tables using Structures and generate strongly-typed queries based on them.

```ts
import { Table } from "gruber";

// The type here is optional, but recommended for portability in larger code bases
export const Person = Table.define<PersonRecord>("people", {
  id: Structure.number(),
  created_at: Structure.date(),
  name: Structure.string(),
});

// list people created before 2nd feb 2022
const people = await Person.select()
  .where` created_at < ${new Date("2022-02-02")} `
  .run(postgres)
  .first();

// Create Jess
const jess = await Person.insert()
  .values({ name: "Jess Smith" })
  .returning(["id", "created_at", "name"])
  .run(postgres)
  .first();

// Update Jess
await Person.update().set({ name: "Jessie Smith" }).where` id = ${jess.id} `
  .returning(["id", "created_at", "name"])
  .run(postgres);

// Delete Jess
await Person.delete().where` id = ${jess.id} `.run(postgres);
```
