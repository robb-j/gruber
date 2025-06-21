---
layout: simple.njk
eleventyNavigation:
  key: Tour
  order: 1
---

# Quick tour

To see what Gruber does, let's make a simple Node.js server.
This is pure JavaScript, but you get a lot of benefits if Gruber's TypeScript without needing to use it directly.

```bash
npm install gruber yargs
```

Let's start by creating a route, **hello-route.js**

```js
import { defineRoute, HttpError } from "gruber";

// A route is a first-class thing, it can easily be passed around and used
export const helloRoute = defineRoute({
  method: "GET",
  pathname: "/hello/:name",
  handler({ request, url, params }) {
    if (params.name === "McClane") {
      throw HttpError.unauthorized();
    }
    return new Response(`Hello, ${params.name}!`);
  },
});
```

A route is a definition to handle a specific HTTP request with a response.
It defines which method and path it is responding to and an asynchronous funcition to generate a response.

Both the [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)
are from the web Fetch API (standards based!).
There is also a `url` (as a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)) of the request and `params`.

The syntax for the pathname is based on [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/URLPattern), another standard. This is used to match the request and generate the strongly-typed `params`. In this example `name` is matched in the request URL and is used to process the request.

Finally, **HTTPError** is a custom Gruber primative that the route knows how to handle, you can throw HTTP error codes for the server to respond with.

With that route, let's use it to create a server with **server.js**:

```js
import { FetchRouter, serveHTTP } from "gruber";
import { helloRoute } from "./hello-route.ts";

export const routes = [helloRoute];

export async function runServer(options = { port: 3000 }) {
  const router = new FetchRouter({ routes });

  await serveHTTP(options, (request) => router.getResponse(request));
}
```

There are a few things going on here too.

**FetchRouter** is a runtime-agnosting routing library, based on the definitions from `defineRoute`

**serveHTTP** is a Node.js helper to quickly start a server using Fetch API Request & Response primatives, rather than the native [IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage) and [ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse). You pass it a function that returns a Response. Inspired by `Deno.serve`.

[More about HTTP →](/http/)

## CLI

Next, we'll need to run out `runServer` method somehow. Let's create a CLI with yargs, **cli.js**

```js
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { runServer } from "./server.js";

const cli = yargs(hideBin(process.argv))
  .help()
  .demandCommand(1, "a command is required");

cli.command(
  "serve",
  "run the http server",
  (yargs) => yargs.option("port", { type: "number", default: 3000 }),
  (args) => runServer(args),
);

try {
  await cli.parseAsync();
} catch (error) {
  console.error("Fatal error:", e);
}
```

This is mostly yargs-specific code, it creates an entrypoint so we can run the server and configure the port it runs on.

## Configuration

The CLI is one way of changing how the application runs by exposing options to configure what the code does. Gruber has a much more in-depth **Configuration** module you can use to declaratively define how all parts of your application are configured.

> Reccomended reading [12 fractured apps](https://medium.com/@kelseyhightower/12-fractured-apps-1080c73d481c) - it really inspired the design of configuration

Lets use configuration, create **config.js**:

We'll break this one down into a few steps, to explain whats going on.

```js
import { getConfiguration } from "gruber";
import pkg from "./package.json" with { type: "json" };

// Get a Node.js specific configuration
const config = getConfiguration();

// Define the structure of our configuration and how to merge together
// the data file, cli arguments and environment variables
const struct = config.object({
  env: config.string({ variable: "NODE_ENV", fallback: "development" }),

  server: config.object({
    port: config.number({
      variable: "APP_PORT",
      flag: "--port",
      fallback: 3000,
    }),
    url: config.url({
      variable: "SELF_URL",
      fallback: "http://localhost:3000",
    }),
  }),

  meta: config.object({
    name: config.string({ variable: "APP_NAME", fallback: pkg.name }),
    version: config.string({ variable: "APP_VERSION", fallback: pkg.version }),
  }),
});
```

First we create our `config` value, this is an opinionated platform-specific value of how to load configuration, parse environment variables and CLI arguments. You can completely customise this, check out the configuration module for more.

Next, we define our configuration schema. This is both definition of the shape and how to parse the configuration. Configuration works with a precedence of **cli argument** > **environment variable** > **configuration file** > **fallback**.

The idea is that you always have a strongly-typed configuration available to use, so other parts of your app can rely on it. For each value in the configuration you specify its fallback and optionally how to pull a value from the CLI or environment variables.

```js
// Load and expose a shared configuration value
export const appConfig = await loadConfiguration(
  new URL("./config.json", import.meta.url),
);

// Load and validate configuration from a file
export async function loadConfiguration(path) {
  const value = await config.load(path, struct);
  if (value.env === "production") {
    if (value.server.url.hostname === "localhost") {
      throw new Error("server.url not set");
    }
  }
  return value;
}
```

The next part is it defines a common `appConfig` for the rest of the app to use.
This is only a **pattern**, you may not want to always load configuration when the file is imported.

The second part of loading configuration is there is space for extra checks for validity, for example here it checks the `server.url` has been set when running in production. This is another **pattern**.

```js
// Output the configuration and how to use it
export function outputConfiguration() {
  console.log(config.getUsage(struct, appConfig));
}
```

Finally we also expose a method to output the configuration and how to use it to the console. This will output something like this:

```
Usage:

| name         | type   | flag   | variable    | fallback               |
| ------------ | ------ | ------ | ----------- | ---------------------- |
| env          | string | ~      | NODE_ENV    | development            |
| meta.name    | string | ~      | APP_NAME    | my-app                 |
| meta.version | string | ~      | APP_VERSION | 1.2.3                  |
| server.port  | number | --port | APP_PORT    | 3000                   |
| server.url   | url    | ~      | SELF_URL    | http://localhost:3000/ |


Default:
{
  "env": "development",
  "server": {
    "port": 3000,
    "url": "http://localhost:3000/"
  },
  "meta": {
    "name": "my-app",
    "version": "1.2.3"
  }
}


Current:
{
  "env": "development",
  "server": {
    "port": 3000,
    "url": "http://localhost:3000/"
  },
  "meta": {
    "name": "my-app",
    "version": "1.2.3"
  }
}
```

You get a markdown table of the configuration and how to use it,
what the default value is if you want to create a local file
and the currently configured value is.

[More about Configuration →](/config/)

We could now add an extra command to our **cli.js**:

```js
import { outputConfiguration } from "./config.js";

// previous code ...

cli.command(
  "config",
  "outputs current configuration and usage information",
  (yargs) => yargs,
  (args) => outputConfiguration(),
);
```

## Migrations

Migrations are another Gruber primative for safely transitioning between states of your application.

Migrations are a directory of JavaScript that are designed to be run in alphabetical order.
A migration is made up of an "up" and "down" function, one to do the change, one to undo it later.
Each migration will only be ran once, so you don't try to create the same table twice.

First, lets create a migration, **migrations/001-add-people.js**:

```js
import { defineMigration } from "gruber";

export default defineMigration({
  async up(sql) {
    await sql`
			CREATE TABLE "people" (
				"id" SERIAL PRIMARY KEY,
				"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
				"name" VARCHAR(255) NOT NULL,
				"avatar_url" VARCHAR(255) DEFAULT NULL
			)
		`;
  },
  async down(sql) {
    await sql`
			DROP TABLE "people"
		`;
  },
});
```

> `defineMigration` is generic but there is `definePostgresMigration` too

Now we need to set up our database and use it in **database.js**

```js
import postgres from "postgres";
import { loader, getPostgresMigrator } from "gruber";
import { appConfig } from "./config.js";

export const useDatabase = loader(() => {
  // You could do some retries/backoffs here
  return postgres(appConfig.database.url);
});

export async function getMigrator() {
  return getPostgresMigrator({
    directory: new URL("./migrations/", import.meta.url),
    sql: await useDatabase(),
  });
}
```

`Migrator` is an agnostic primative for migrating there is also a bespoke integration with [postgres.js](https://github.com/porsager/postgres).
When used agnostically, it facilitates the preperation and running of migrations.
With postgres, it uses that facilitation to add a `migrations` table to track which have been run and execute new ones.

> `loader` is a utility to run a function once and cache the result for subsequent calls, it's a very basic "memo".
> It returns a method that either calls the factory function or returns the cached result.
> The name could be better.

Let's add a command that runs our migrations to **cli.js**

```js
import { getMigrator } from "./database.js";

// previous code ...

cli.command(
  "migrate up",
  "migrates the database to match code",
  (yargs) => yargs,
  async (args) => {
    const migrator = await getMigrator();
    await migrator.up();
  },
);

cli.command(
  "migrate down",
  "nukes the database",
  (yargs) => yargs,
  async (args) => {
    const migrator = await getMigrator();
    await migrator.down();
  },
);
```

The `Migrator` is agnostic and provides a bespoke integration with [postgres.js](https://github.com/porsager/postgres).
When used agnostically, it facilitates the preperation and running of migrations.
With postgres, it uses that facilitation to add a `migrations` table to track which have been run and execute new ones.

[More about Migrations →](/core/#migrations)

## Testing

> WIP

The basic principle is to call your routes directly from tests with `TestingRouter` and you can also override `dependencies` to mock/stub so you don't use your actual database.

[More about Testing →](/testing/)
