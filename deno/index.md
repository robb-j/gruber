---
layout: api.njk
eleventyNavigation:
  key: Deno
  parent: Integrations
api:
  entrypoint: deno/mod.ts
---

# Deno

This module provides the integration between Gruber and Deno, along with platform-specific utilities and Gruber primative.

### Install

Gruber is available at `esm.r0b.io/gruber@{{ pkg.version }}/mod.ts`, add it to your _deno.json_:

<esm-info endpoint="https://esm.r0b.io"></esm-info>

```json
{
  "imports": {
    "gruber/": "https://esm.r0b.io/gruber@{{ pkg.version }}/"
  }
}
```

Then use it these entrypoints:

- `gruber/mod.ts`
- `gruber/config/mod.ts`
- `gruber/core/mod.ts`
- `gruber/http/mod.ts`
- `gruber/postgres/mod.ts`
- `gruber/testing/mod.ts`

For example:

```js
import { defineRoute } from "gruber/mod.ts";
```

### Integrations

There are platform-specific integrations with the **Configuration**, **Postgres** & **Terminator** modules:

```js
import { getConfiguration, getPostgresMigrator, getTerminator } from "gruber";

// Get a Deno specific Configuration instance that
// loads files uses 'Deno.readTextFile' and parses them through JSON
const config = getConfiguration();

// Get a Migrator using the Deno filesystem and
// the postgres.js library
const migrator = getPostgresMigrator({
  sql: postgres("postgres://…"),
  directory: new URL("./migrations/", import.meta.url),
});

// Get a terminator that listens to Deno's addSignalListener
const arnie = getTerminator();
```

### Utilities

There aren't currently any Deno-specific utilities

> TODO: the current TypeScript generated API Docs doesn't work with Deno yet.
>
> Exported symbols:
>
> - `getConfigurationOptions`
> - `getConfiguration`
> - `DenoRouter`
> - `serveRouter`
> - `getPostgresMigratorOptions`
> - `getPostgresMigrator`
> - `getTerminatorOptions`
> - `getTerminator`
