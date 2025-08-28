---
layout: api.njk
eleventyNavigation:
  key: Node.js
  parent: Integrations
api:
  entrypoint: node/mod.ts
---

# Node.js

This module provides an integration between Gruber and Node.js
along with platform-specific utilitites and Gruber primatives.

There are also opt-in modules for specific integrations and a polyfill if you are using an older Node.js.
You have to import these with specific paths, they are not included in the default export.

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
