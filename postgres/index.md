---
layout: api.njk
eleventyNavigation:
  key: Postgres
  parent: Integrations
api:
  entrypoint: postgres/mod.ts
---

> **WORK IN PROGRESS — DO NOT USE**

# Postgres

This module provides an abstraction over postgres called `PostgresService` along with utilities to integrate it with other Gruber modules.

There are methods like `getPostgresMigrations`, `executePostgresMigration` and `postgresBootstrapMigration` to help platforms like Deno and Node.js implement a [Migrator](/core/#migrator).

There is also `PostgresStore` that implements the [Store](/core/#store) interface.
