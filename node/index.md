---
layout: api.njk
eleventyNavigation:
  key: Node.js
  parent: Integrations
api:
  entrypoint: node/mod.ts
---

# Node.js

This module provides the integration between Gruber and Node.js,
along with platform-specific utilitites and Gruber primatives.

There are also opt-in modules for specific integrations and a polyfill if you are using an older Node.js.
You have to import these with specific paths, they are not included in the default export.

### Install

Gruber is available through [NPM](https://www.npmjs.com/package/gruber) for Node.js.

```
npm install gruber
```

### Integrations

There are platform-specific integrations with the **Configuration**, **Postgres** & **Terminator** modules:

```js
import postgres from "postgres";
import { getConfiguration, getPostgresMigrator, getTerminator } from "gruber";

// Get a Node.js specific Configuration instance that
// loads files using 'fs' and parses them through JSON
const config = getConfiguration();

// Get a Migrator using the Node.js filesystem and
// the postgres.js library
const migrator = getPostgresMigrator({
  sql: postgres("postgres://…"),
  directory: new URL("./migrations/", import.meta.url),
});

// Get a terminator that listens to Node.js' process signals
const arnie = getTerminator();
```

### Utilities

There are some Node.js specific utilities too, to help with Gruber integration and web-standards.

```js
import { serveHTTP } from "gruber";

// Create a node:http server, wrapped with the Fetch API Request/Response objects.
serveHTTP({ port: 3000 }, async (request) => {
  return Response.json({ message: "ok" });
});
```

### Polyfil

```js
// Import this as soon as possible to ensure
// the web-standards primatives Gruber expects are available.
import "gruber/polyfill.js";
```

### Express

There is a middleware for using a `FetchRouter` with an [Express](https://expressjs.com/) application.

```js
import express from "express"
import { FetchRouter } from "gruber";
import { expressMiddleware } from "gruber/express-router.js";

const router = new FetchRouter(…)
const app = express()
  .use(…)
  .use(expressMiddleware(router))
  .use(…)
```

### Koa

There is a middleware for using a `FetchRouter` with a [koa](https://koajs.com/) application.

```js
import Koa from "koa"
import { FetchRouter } from "gruber";
import { koaMiddleware } from "gruber/koa-router.js";

const router = new FetchRouter(…)
const app = new Koa()
  .use(…)
  .use(koaMiddleware(router));
  .use(…)
```
