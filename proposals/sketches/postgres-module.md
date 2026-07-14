---
title: Postgres Module
date: 2026-03-08
---

# Postgres Module

This module provides an abstraction around a connection to a Postgres database so that other modules can consume a common API.
There is currently the `SqlDependency` type which is used to interface to [postgres.js](https://github.com/porsager/postgres)
but I think if new features start to depend on this it'll quickly get messy.
A light wrapper around that which is owned by Gruber would be better going forwards
and hopefully it'll mean that the implementation could be swapped out for other dependencies in the future.

I think it is best to keep this scoped as "postgres" rather than trying to also abstract "sql" to keep things simpler.

## Design

The `Postgres` class wraps the connection to a postgres database and allows you to query and perform transactions.

```ts
import { getPostgresClient } from "gruber";

const postgres = getPostgresClient({
  client: new URL("postgres://user:secret@localhost:5342/database_name"),
});

interface UserRecord {
  id: number;
  created: Date;
  name: string;
}

// Query for records with automatic SQL escaping
const users = await postgres.execute<UserRecord>`
  SELECT id, created, name
  FROM users
  WHERE created > ${new Date("2020-02-02")}
`;

// Prepare objects / JSON for the query
const init = postgres.prepare({
  name: "Geoff Testington",
  metadata: postgres.json({ some: "thing" }),
});

// Add a user
await postgres.execute<UserRecord>`
  INSERT INTO users ${init}
  RETURNING id, created, name
`;

// Conditional clauses
const clause =
  totalPets < 13
    ? postgres.clause` age > 42 `
    : postgres.clause` num_pets < 1 `;

await postgres.execute`
  SELECT id, created, name, age, num_pets
  FROM people
  WHERE ${clause}
`;

// Explicit transaction ~ automatically comitted on success or rolled back on failure
async function updateRecords() {
  await using trx = await postgres.transaction();

  await trx.execute` UPDATE users … `;
  await trx.execute` UPDATE profiles … `;
}

// Manual transaction
const trx = await postgres.transaction();
try {
  await trx.execute` UPDATE users … `;
  await trx.execute` UPDATE profiles … `;
} finally {
  await trx.dispose();
}

// Close the connection
await postgres.dispose();
```

Tables let you set up validation for the records you put into the database
and help type records you query out of it.

> These should maybe be a seperate GEP?

```ts
import { getPostgresClient, Table, Structure } from "gruber";

const postgres = getPostgresClient("…");

const UserTable = new Table<UserRecord>("users", {
  id: Structure.number(),
  created: Structure.date(),
  name: Structure.string(),
  email: Structure.string(),
});

// prettier-ignore
const geoff = await postgres.execute(
  UserTable.insertOne({
    username: "geoff-testington",
    email: "geoff@example.com" 
  })
  .returnAll()
);

// prettier-ignore
const geoff2 = await postgres.execute(
  UserTable.selectOne()
    .where` id = ${42}`
);

// prettier-ignore
const newestUsers = await postgres.execute(
  UserTable.select()
    .orderBy('created', 'desc')
);

// prettier-ignore
const updatedUsers = await postgres.execute(
  UserTable.update()
    .where`created IS NULL`
    .set({ created: new Date() })
    .returning(['id', 'name', 'created']),
);

// prettier-ignore
const updatedGeoff = await postgres.execute(
  UserTable.updateOne()
    .where`id = ${42} `
    .set({ email: "geoff2@example.com" })
    .returnAll(),
);
```

## Follow on

- Handling the connection state with expenential reconnections / back-off

## References

- https://github.com/porsager/postgres
- https://github.com/halvardssm/stdext/pull/6
- [Make Place tables](https://github.com/digitalinteraction/make-place/blob/8a17377e37d249172e71ce7de0f9fa26c8897df6/server/database.ts)
- [Open Lab Hub tables](https://github.com/digitalinteraction/hub.openlab.dev/blob/v0.9.2/api_server/database.ts)

## Implementation

- [ ] Initial Sketch
- [ ] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
