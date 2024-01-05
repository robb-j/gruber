# Gruber

An isomorphic JavaScript library for creating web apps.

> Named for [Hans](https://purl.r0b.io/gruber)

## Foreword

I don't really know if I should be making a JavaScript library like this.
The various ideas it's composed of have been floating around in my mind for a year or so and writing this has helped explore those ideas.
The documentation below is written as if the library I want to make exists, **it does not**.

I quite like this documentation-driven-design.
It really helps to think through the concepts and ideas of something before spending lots of time building it.

If this is something that interests you, reach out to me on [Mastodon](https://hyem.tech/@rob).

## Background

I've spent the past few years working on JavaScript backends and nothing has really stuck with me.
There have been lots of nice ideas along the way but no one solution ever felt like home.
It always felt like starting from scratch for each project.
Some of the apps I've made:

- [Open Lab Hub](https://github.com/digitalinteraction/hub.openlab.dev)
  — Deno + Oak + vue3 + vite
- [BeanCounter](https://github.com/digitalinteraction/beancounter)
  — Node.js + Koa + vanilla js + parcel
- [MozFest Plaza](https://github.com/digitalinteraction/mozfest)
  — Node.js + Koa + vue2 + webpack
- [Sticker Stories](https://github.com/digitalinteraction/sticker-stories)
  — Node.js + Koa + vue3 + vite
- [Data Diaries](https://github.com/digitalinteraction/data-diaries)
  — Node.js + Koa + vue3 + vite
- [DataOfficer](https://github.com/digitalinteraction/data-officer)
  — Deno + Acorn
- [IrisMsg](https://github.com/digitalinteraction/iris-msg/tree/master)
  — Node.js + Express + native app
- [Poster Vote](https://github.com/digitalinteraction/poster-vote)
  — Node.js + Express + vue + webpack

## About

Gruber is a library of composable utilities for creating isomorphic JavaScript applications,
that means web-standards JavaScript on the front- and backend.
It's bet is that web-standards aren't going to change, so it is be based around them to create apps that don't break in the future.
There's also a hope that [WinterCG](https://wintercg.org/work) works some stuff out.

Gruber acknowledges that web-standards don't do everything we want (yet) and that they aren't implemented properly everwhere.
For this reason, the core of Gruber is agnostic but there are helpers for using common runtimes & libraries with the core.

Gruber itself is a library and can be used however you like. There are **patterns** which you can apply if you like.
Patterns are ways of structuring your code if you don't already have opinions on the matter.
They also help to explain why Gruber is made in the way it is.

With a common agnostic core, there can be modules built on top that can be used agnostically too.
If the modules themselves are agnostic of course.

There is a lot not in Gruber too. By design things like CORs should be implemented at a higher level.
A Gruber app should be run behind a reverse proxy and that can do those things for you.

## Focus

- `URLPattern` based routing that is testable
- `fetch` based routes using [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
  and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)
- Simple database migrations
- Configuration to control how apps work
- A common core for reusable modules to built be upon

## Design goals

- Composability — logic should be composed together rather than messily intertwined
- Standards based — where available existing standards should be applied or migrated towards
- Agnostic — a frontend framework or backend runtime shouldn't be forced upon you
- Patterns — how you _could_ use modules rather than enforce an implementation
- Minimal — start small, carefully add features and consider removing them
- No magic — it's confusing when you don't know whats going on

## Examples

### HTTP server

First a HTTP route to do something:

**hello-route.js**

```js
import { defineRoute, HttpError } from "@gruber/core";

// A route is a first-class thing, it can easily be passed around and used
export default defineRoute({
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

A route is a definition to handle a specific HTTP request by returning a response.
It defines which method and path it is responding to and an asynchronous function to handle the request.

The request is a fetch [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
and the [response too](https://developer.mozilla.org/en-US/docs/Web/API/Response).

It also takes the `url` (as a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)) of the request and `params`.
The parameters are matched from the pathname, part of the result of [URLPattern.exec](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/exec).
In this example `name` is matched in the request URL and is used to process the request.

Let's add the route to a Node.js server:

**server.js**

```js
import { createServer } from "node:http";
import { NodeRouter } from "@gruber/node";

import helloRoute from "./hello-route.js";

export const routes = [helloRoute];

export async function runServer(options) {
	const router = new NodeRouter({ routes });
	const server = createServer(router.forHttpServer());

	await new Promise((resolve) => server.listen(options.port, resolve));
	console.log("Listening on http://localhost:%d", options.port);
}
```

Then you could have a cli:

**cli.js**

```ts
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

If you were using Deno, you can alter your **server.js**:

> You'd have to change the `const cli = yargs(hideBin(process.argv))` of **cli.js** too

```js
import { DenoRouter } from "@gruber/deno/mod.js";

import helloRoute from "./hello-route.js";

export const routes = [helloRoute];

export async function runServer(options) {
	const router = new DenoRouter({ routes });

	Deno.serve({ port: options.port }, router.forServe());

	console.log("Listening on http://localhost:%d", options.port);
}
```

That's how the same HTTP logic can be run on Deno and Node.
Gruber doesn't expect you'll change runtime during a project,
but now you can have more-common-looking code on different projects.

### Configuration

In production, it is very useful to be able to configure how an app behaves without having to modify the code and redeploy the entire app.
That is what configuration is for, it lets you change how the app runs by altering the configuration.
The configuration can come from different places too, like a JSON file, environment variables or maybe arguments to your CLI.

[12 fractured apps](https://medium.com/@kelseyhightower/12-fractured-apps-1080c73d481c) really inspired the design of configuration, to summerise it should be:

- Load in from the environment and/or configuration files
- Have sensible defaults so it does not fail if environment variables or configuration files are missing
- Apply a precidence of configuration between different sources
- Always structurally valid so the rest of you code can assume that

Things you might want to configure:

- How much logging to do
- The databases to connect to
- Which features to turn on or off
- Tokens for thirdy-party APIs
- Who to send emails from

Gruber provides the utilities to specify this information and load it in from the environment youe code is running in.
It uses a pattern of `environment variables > configuration file > fallback` to decide which values to use.
The end result is a configuration object you can share between all of your code that you know is well-formed.

Configuration is heavily inspired by [superstruct](https://docs.superstructjs.org/) which has a lovely API.

Building on the [HTTP server](#http-server) above, we'll setup configuration. Still using Node.

**config.js**

```js
import fs from "node:fs";
import process from "node:process";

import { NodeConfig } from "@gruber/node";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const config = new NodeConfig(fs, process);

// const config = NodeConfig.fromEnvironment(fs, process);
// > common-api constructor idea?
// > does NodeConfig.fromEnvironment create a new Config(commonApi) ??

export function getConfiguration() {
	return config.object({
		env: config.env("NODE_ENV", "development"),

		selfUrl: config.url("SELF_URL", "http://localhost:3000"),

		meta: config.object({
			name: config.string("APP_NAME", pkg.name),
			version: config.string("APP_VERSION", pkg.version),
		}),

		database: config.object({
			url: config.url(
				"DATABASE_URL",
				"postgres://user:secret@localhost:5432/user",
			),
		}),

		// IDEAS:
		// something: [config.string(), config.env("SOMETHING"), "fallback"],
		// another: config(config.env("SOMETHING"), config.string(), "fallback"),
	});
}

// Synchronously load configuration,
// it should be loaded as fast as possible when the app starts up
export function loadConfiguration(path) {
	return config.loadJsonSync(path, getConfiguration());
}

// TypeScript note:
// export type Configuration = Infer<ReturnType<typeof getConfiguration>>

// Expose the configutation for use in the application
export const appConfig = loadConfiguration(
	new URL("./config.json", import.meta.url),
);
```

> You might want to consider the security for your default values,
> e.g. if you app runs differently under NODE_ENV=production
> and you forget to set it, what is the implication?

you could provide a configuration file like **config.json** to load through it:

```jsonc
{
	"env": "production",
	"selfUrl": "https://example.com",
	"meta": {
		"version": "1.0.0-beta-5"
	},
	"database": {
		"url": "postgres://user:top_secret@database.io:5432/database_name"
	}
}
```

When loaded in, it would:

- override `env` to be "production"
- override `safeUrl` and parse it as a `URL` object
- override `meta.version` but use the default `meta.name`
- override `database.url` to be the production value

If run with a `NODE_ENV=staging` environment variable, it would set `env` to "staging"

We can add a CLI command to demonstrate using this configuration.
Add this command to **cli.js**, below the "serve" command":

```ts
import { appConfig } from "./config.js";

// cli.command(
//   "serve",
//   ...
// );

cli.command(
	"config",
	"outputs computed configuration",
	(yargs) => yargs,
	(args) => {
		console.log(appConfig);
	},
);
```

### Migrations

Building on [Configuration](#configuration), we'll add database migrations to our Gruber app.

First, lets create a migration, **migrations/001-add-people.js**:

```js
import { defineMigration } from "@gruber/core";

export default defineMigration({
	async up(sql) {
		await sql`
      CREATE TABLE "people" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "name" VARCHAR(255) NOT NULL,
        "avatar" VARCHAR(255) DEFAULT NULL
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

and we need to set up our database with **database.js**

```js
import process from "node:process";
import postgres from "postgres";
import { loader, Migrator } from "@gruber/node";
import { appConfig } from "./config.js";

export const useDatabase = loader(async () => {
	// You could do some retries/backoffs here
	return postgres(appConfig.database.url);
});

export const migrationsDir = new URL("./migrations", import.meta.url);

export function getMigrator() {
	return Migrator.postgres(migrationsDir, () => useDatabase());
}
```

> `loader` is a utility to run a function once and cache the result for subsequent calls.
> It returns a method that either calls the factory function or returns the cached result.

Then we can add to our CLI again, **cli.js**:

```ts
import { getMigrator } from "./database.js";

// cli.command(
//   "config",
//   ...
// );

cli.command(
	"migrate up",
	"migrates the database to match code",
	(yargs) => yargs,
	async (args) => {
		const migrator = getMigrator();
		await migrator.up();
	},
);

cli.command(
	"migrate down",
	"nukes the database",
	(yargs) => yargs,
	async (args) => {
		const migrator = getMigrator();
		await migrator.down();
	},
);
```

With that in place, you can run the migrations.
Gruber internally will set up the migration infrastructure too.

The `Migrator` is agnostic and provides a bespoke integration with [postgres.js](https://github.com/porsager/postgres).
When used agnostically, it facilitates the preperation and running of migrations.
With postgres, it uses that facilitation to add a `migrations` table to track which have been run and execute new ones.

### Testing

Let's write a test for our route.

**hello-route.test.js**

```js
import assert from "node:assert";
import { describe, it } from "node:test";

import { NodeRouter } from "@gruber/node";
import helloRoute from "./hello-route.js";

describe("hello route", () => {
	const router = new NodeRouter({ routes: [helloRoute] });

	it("uses GET", () => {
		assert.equal(helloRoute.method, "GET");
	});
	it("says hello", async () => {
		const response = await router.handle(new Request("/hello/Geoff"));
		assert.equal(response.status, 200);
		assert.equal(await response.text(), "Hello, Geoff!");
	});
	it("blocks McClane", async () => {
		const response = await router.handle(new Request("/hello/McClane"));
		assert.equal(response.status, 401);
	});
});
```

You use the same `Request` & `Response` objects to test your code!
No need for mock servers.

Next testing routes when there is a dependency (e.g. a database)

**search-route.js**

```js
import { defineRoute } from "@gruber/core";
import { useDatabase } from "./database.js";

export const searchRoute = defineRoute({
	method: "POST",
	pathname: "/search",
	async handler({ request }) {
		const body = await request.json();
		const sql = await useDatabase();

		const result = await sql`
			SELECT id, created, name, avatar
			FROM people
			WHERE LOWER(name) LIKE LOWER(${"%" + body.name + "%"})
		`;
		return Response.json(result);
	},
});
```

and to test the route, **search-route.test.js**

```js
import assert from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { NodeServer, magicLoad } from "@gruber/node";

import searchRoute from "./search-route.js";
import { useDatabase } from "./database.js";

// WIP — exploring "magic loader" snippet below
// Thoughts — this is very much in the magic realm, I don't like it

describe("search route", () => {
	const router = new NodeRouter({ routes: [searchRoute] });
	beforeEach(() => {
		useDatabase[magicLoad] = () => [
			{
				id: 1,
				created: new Date("2024-01-01"),
				name: "Geoff Testington",
				avatar: null,
			},
		];
	});

	it("uses POST", () => {
		assert.equal(searchRoute.method, "POST");
	});
	it("returns people", async () => {
		const request = new Request("/search", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ name: "Geoff" }),
		});

		const response = await router.handle(request);
		assert.equal(response.status, 200);
		assert.deepEqual(await response.json(), [
			{
				id: 1,
				created: new Date("2024-01-01"),
				name: "Geoff Testington",
				avatar: null,
			},
		]);
	});
});
```

More complicated functions should be broken down into different parts.
Parts which themselves can be tested individually.

Let's try again, **search-route.js**:

```js
import { defineRoute } from "@gruber/core";
import { useDatabase } from "./database.js";

export function queryPeople(sql, body) {
	return sql`
		SELECT id, created, name, avatar
		FROM people
		WHERE LOWER(name) LIKE LOWER(${"%" + body.name + "%"})
	`;
}

export const searchRoute = defineRoute({
	method: "POST",
	pathname: "/search",
	async handler({ request }) {
		const body = await request.json();
		const sql = await useDatabase();
		return Response.json(await queryPeople(sql, body));
	},
});
```

Then you could test `queryPeople` on its own, so add to **search-route.test.js**:

```js
import searchRoute, { queryPeople } from "./search-route.js";

// describe('search route', ...)

// TODO: this is still a bit gross

describe("queryPeople", () => {
	it("formats for LIKE", async () => {
		let args = null;
		const result = await queryPeople((...a) => (args = a), {
			name: "Geoff",
		});
		assert.equals(args[1], ["%Geoff%"]);
	});
});
```

TODO: I'm not happy with this, will need to come back to it.

---

<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->

## Rob's notes

- https://stackoverflow.com/questions/67049890/how-can-i-turn-a-node-js-http-incomingmessage-into-a-fetch-request-object
- it's weird that config definitions read: `(2) config > (1) env > (3) fallback`
- `getConfiguration` that thing should have it's own name
- should exposing `appConfig` be a best practice?
- what other types of `Migrator` could there be, is it worth the abstraction?
- ways of passing extra migrations to the Migrator ie from a module
- `node` & `deno` could export all of `core`?
- is there too much magic in [Configuration](#configuration)

## nice snippets

**simpler loader**

```ts
interface Loader<T> {
	(): T;
}

export function loader<T>(handler: Loader<T>): Loader<T> {
	let result: T | null = null;
	return () => {
		if (!result) result = handler();
		return result;
	};
}
```

**magic loader**

```ts
interface Loader<T> {
	(): T;
}

// I know I said no magic...
export const magicLoad = Symbol("magicLoad");

export function loader<T>(handler: Loader<T>): Loader<T> {
	let result: T | null = null;
	return () => {
		if (loader[magicLoad]) return loader[magicLoad];
		if (!result) result = handler();
		return result;
	};
}
```

**generic backoff method**

```js
async function retryWithBackoff({
	maxRetries = 20,
	interval = 1_000,
	handler,
}) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			const result = await handler();
			return result;
		} catch {
			await new Promise((r) => setTimeout(r, i * interval));
		}
	}
	console.error("Could not connect to database");
	process.exit(1);
}

retryWithBackoff({
	maxTries: 20,
	interval: 1_000,
	async handler() {
		const sql = postgres(appConfig.database.url);
		await sql`SELECT 1`;
		return sql;
	},
});
```
