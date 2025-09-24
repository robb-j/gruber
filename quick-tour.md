---
layout: simple.njk
eleventyNavigation:
  key: Tour
  order: 1
---

# Quick tour

To see what Gruber does, let's make a simple **Node.js** server with JavaScript.
You get a lot of TypeScript benefits using Gruber's without needing to use it directly.

```bash
npm install gruber
```

Let's start by creating a route, **hello-route.js**

```js
import { defineRoute, HTTPError } from "gruber";

// A route is a first-class thing, it can easily be passed around and used
export const helloRoute = defineRoute({
  method: "GET",
  pathname: "/hello/:name",
  handler({ request, params }) {
    if (params.name === "McClane") {
      throw HTTPError.unauthorized();
    }
    return new Response(`Hello, ${params.name}!`);
  },
});
```

A route is a definition of how to handle a certain HTTP requests by serving them with a response.
It defines which HTTP method and path to respond to and an asynchronous function to generate a response.

This is uses nice standards like
[Request](https://developer.mozilla.org/en-US/docs/Web/API/Request),
[Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)
and [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/URLPattern).
Those `params` are strongly-typed based on the pathname you passed too!
You can also easily throw a **HTTPError** and Gruber knows what to do with them.

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

**FetchRouter** is a runtime-agnostic routing library, based on the definitions from `defineRoute`.
You give it a set of RouteDefinitions and it processes them.

**serveHTTP** is a Node.js helper to quickly start a server using the Fetch API, wrapping Node.js primitives.
You pass it options and a function that returns a Response. Inspired by `Deno.serve`.

[More about HTTP →](/http/)

## CLI

> Work in progress...

Next, we'll need to run out `runServer` method somehow. Let's create a CLI, **cli.js**

```js
import process from "node:process";
import { runServer } from "./server.js";

const [command] = process.args.slice(2);

if (import.meta.main) {
  if (command === "serve") await runServer();
}
```

> There is something Gruber-shaped here, but it is TBD ~ [#54](https://github.com/robb-j/gruber/issues/54)

## Configuration

A CLI nicely controls which code is run and can provide arguments to configure how it works.
Applications often need to use user-defined values or secrets,
so the same app can run in different environments or perform the same operation on different things.

Gruber has an in-depth **Configuration** module to declaratively define how all parts of the application are configured based on the from the environment they run in.

Lets use configuration, create **config.js**:

```js
import { getConfiguration } from "gruber";

// Get a platform specific configuration
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
});
```

First we create our `config` value, this is an opinionated instance of the `Configuration` class.
It's used to load JSON files, parse environment variables and look up CLI arguments.
You can create your own instance to completely customise this.

Next, we use it to define the application's configuration.
This is a definition of the shape of, and how to generate it from the runtime environment.
Here there are three values:

- `env` — a string configured with the `NODE_ENV` environment variable that defaults to `development`.
- `server.port` — the port to listen on, set via the `APP_PORT` variable, `--port` argument or just 3000.
- `server.url` — the url which the server is accessible set with `SELF_URL` or falling back to localhost.

Any combination of these could also be set from a configuration and Gruber will merge all the values together into a strongly-typed value, for example:

```json
{ "env": "production", "server": { "port": 8000 } }
```

The idea is that you always have a strongly-typed configuration available to use, so other parts of your app can rely on it. For each value in the configuration you specify its fallback and optionally how to pull a value from the CLI or environment variables.

```js
// Load and validate configuration from a file
export async function loadConfiguration(path) {
  return config.load(path, struct);
}

// Load and expose a shared configuration value
export const appConfig = await loadConfiguration(
  new URL("./config.json", import.meta.url),
);
```

The next part is to load the configuration into a value, `appConfig`, for the rest of the app to use.
This is only a **pattern**, you may not want to always load configuration when the file is imported.

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
```

You get a markdown table of the configuration and how to use it,
what the default value is if you want to create a local file
and the currently configured value is.

We could now add an extra command to our **cli.js**:

```js
import { outputConfiguration } from "./config.js";

// previous code ...

if (import.meta.main) {
  if (command === "serve") await runServer();
  if (command === "config") await outputConfiguration();
}
```

[More about Configuration →](/config/)

## Migrations

Migrations are Gruber primitive for safely transitioning between states of your application.

They are a directory of JavaScript files that are designed to be run in alphabetical order.
Each migration is made up of an "up" and "down" function, one to perform the change, one to reverse it.
Migrations will only be ran once, so you don't try to create the same table twice.

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

> You might want `definePostgresMigration` which is part of the [Postgres module](/postgres)

Now we need to set up our database and use it in **database.js**

```js
import postgres from "postgres";
import { loader, getPostgresMigrator } from "gruber";
import { appConfig } from "./config.js";

// This is a WIP syntax
export const useDatabase = loader(() => {
  return postgres(appConfig.database.url);
});

export async function runMigrations(dir = "up") {
  const migrator = await getPostgresMigrator({
    directory: new URL("./migrations/", import.meta.url),
    sql: await useDatabase(),
  });

  if (dir === "up") return migrator.up();
  if (dir === "down") return migrator.down();
}
```

`Migrator` is an agnostic primitive for migrating anything.
The **Postgres** module provides a bespoke version for running database migrations.
The agnostic version facilitates the preparation and running of migrations.
With postgres, it uses that facilitation to add a `migrations` table to track which have been run and execute new ones.

> `loader` is a utility to run a function once and cache the result for subsequent calls, it's a very basic "memo".
> It returns a method that either calls the factory function or returns the cached result.
> The name could be better.
>
> This might be a "dependency"-esk module in the future, maybe `defineDependency`

Let's add a command that runs our migrations to **cli.js**

```js
import { runMigrations } from "./database.js";

// previous code ...

if (import.meta.main) {
  if (command === "serve") await runServer();
  if (command === "config") await outputConfiguration();
  if (command === "migrate-up") await runMigrations("up");
  if (command === "migrate-down") await runMigrations("down");
}
```

Now we can run and un-run our migrations from the command line.

[More about Migrations →](/core/#group-migrator)

## Testing

> Coming soon

The basic principle is to call your routes directly from tests with `TestingRouter` and you can also override `dependencies` to mock/stub so you don't use your actual database.

[More about Testing →](/testing/)
