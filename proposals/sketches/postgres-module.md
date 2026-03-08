---
title: Postgres Module
date: 2026-03-08
---

# Postgres Module

This module provides an abstraction around a connection to a Postgres database so that other modules can consume a common API.
There is currently the `SqlDependency` type which is used to interface between [postgres.js](https://github.com/porsager/postgres)
but I think if new features start to depend on this it'll quickly get messy.
A light wrapper around that which is owned by Gruber would be better going forwards
and hopefully it'll mean that the implementation could be swapped out for other dependencies in the future.

I think it is best to keep this scoped as "postgres" rather than trying to also abstract "sql" to keep things simpler.

## Design

The `Postgres` class wraps the connection to a postgres database and allows you to query and perform transactions.

```ts
import postgres from "postgres";
import { getPostgres } from "gruber";

const postgres = getPostgres({
  client: postgres("postgres://user:secret@localhost:5342/database_name"),
});

interface UserRecord {
  id: number;
  created: Date;
  name: string;
}

// Query for records
const users = await postgres.execute<UserRecord>`
  SELECT id, created, name
  FROM users
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

// Explicit transaction
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
import { getPostgres, Table, Structure } from "gruber";

// …

const UserTable = new Table<UserRecord>("users", {
  id: Structure.number(),
  created: Structure.date(),
  name: Structure.string(),
});

const user = await UserTable.selectOne(postgres, {
  where: { id: 42 },
});

// …
```

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
