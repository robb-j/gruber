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

import { getNodeConfiguration, Configuration } from "@gruber/node";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const config = getNodeConfiguration(fs, process);

// const config = NodeConfig.fromEnvironment(fs, process);
// > common-api constructor idea?
// > does NodeConfig.fromEnvironment create a new Config(commonApi) ??

export function getSpecification() {
	return config.object({
		env: config.string({
			variable: "NODE_ENV",
			fallback: "development",
		}),

		selfUrl: config.url({
			variable: "SELF_URL",
			fallback: "http://localhost:3000",
		}),

		// Short hands?
		meta: config.object({
			name: config.string({ flag: "--app-name", fallback: pkg.name }),
			version: config.string({ fallback: pkg.version }),
		}),

		database: config.object({
			url: config.url({
				variable: "DATABASE_URL",
				flag: "--database-url",
				fallback: "postgres://user:secret@localhost:5432/database",
			}),
		}),
	});
}

// Load the configuration and parse it
export function loadConfiguration(path) {
	return config.load(path, getSpecification());
}

// TypeScript thought:
// export type Configuration = Infer<ReturnType<typeof getSpecification>>

// Expose the configutation for use in the application
export const appConfig = await loadConfiguration(
	new URL("./config.json", import.meta.url),
);

// Export a method to generate usage documentation
export function getConfigurationUsage() {
	return config.getUsage(getSpecification());
}
```

#### usage info

The usage output will be:

```
Usage:

| key          | type   | argument       | variable     | default value |
| ============ | ====== | ============== | ============ | ============= |
| env          | string | ~              | NODE_ENV     | "development" |
| selfUrl      | url    | ~              | SELF_URL     | "http://localhost:3000" |
| meta.name    | string | --app-name     | ~            | gruber-app |
| meta.version | string | ~              | ~            | 1.2.3 |
| database.url | url    | --database-url | DATABASE_URL | postgres://user:top_secret@database.io:5432/database_name |

Defaults:
{
	"env": "development",
	"selfUrl": "http://localhost:3000",
	"meta": {
		"name": "gruber-app",
		"version": "1.2.3"
	},
	"database": {
		"url": "postgres://user:top_secret@database.io:5432/database_name"
	}
}
```

#### fallbacks

You can provide a configuration file like **config.json** to load through the config specification:

```jsonc
{
	"env": "production",
	"selfUrl": "http://localhost:3000",
	"meta": {
		"name": "gruber-app",
		"version": "1.2.3"
	},
	"database": {
		"url": "postgres://user:secret@localhost:5432/database"
	}
}
```

When loaded in, it would:

- override `env` to be "production"
- override `safeUrl` and parse it as a `URL` object
- override `meta.version` but use the default `meta.name`
- override `database.url` to be the production value

If run with a `NODE_ENV=staging` environment variable, it would set `env` to "staging"

#### considerations

You should to consider the security for your default values,
e.g. if you app runs differently under NODE_ENV=production
and you forget to set it, what is the implication?

If you use something like `dotenv`, ensure it has already loaded before creating the `Configuration`

You could add extra checks to `loadConfiguration` to ensure things are correct in production,
this can be done like so:

```js
export function loadConfiguration() {
	const appConfig = config.loadJsonSync(path, getSpecification());

	// Only run these checks when running in production
	if (appConfig.env === "production") {
		if (appConfig.database.url.includes("top_secret")) {
			throw new Error("database.url has not been configured");
		}
		// more checks ...
	}

	return appConfig;
}
```

This checks the default value for `database.url` is not used when in production mode.

#### configuration commands

We can add a CLI command to demonstrate using this configuration.
Add this command to **cli.js**, below the "serve" command":

```ts
import { appConfig, getConfigurationUsage } from "./config.js";

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

cli.command(
	"usage",
	"outputs computed configuration",
	(yargs) => yargs,
	(args) => {
		console.log(getConfigurationUsage());
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

// TODO: this isn't the current API
export function getMigrator() {
	return Migrator.postgres(migrationsDir, () => useDatabase());
}
```

> `loader` is a utility to run a function once and cache the result for subsequent calls.
> It returns a method that either calls the factory function or returns the cached result.

#### migrate command

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

## Meta APIs

There are APIs within Gruber for using it at a meta level.
That means internal interfaces for using Gruber in different ways than described above.

### Configuration API

The Configuration class is the base for how configuration works and can be used by itself to make you configuration work in different ways.

To see how it works, look at the [Node](./node/source/configuration.js) and [Deno](./deno/configuration.ts) implementations.

You can use the static `getOptions` method both subclasses provide and override the parts you want.
These are the options:

- `superstruct` — Configuration is based on [superstruct](https://docs.superstructjs.org/), you can pass your own instance if you like.
- `readTextFile(url)` — How to load a text file from the file system
- `getEnvironmentVariable(key)` — Return a matching environment "variable" for a key
- `getCommandArgument(key)` — Get the corresponding "flag" from a CLI argument
- `stringify(value)` — How to write the whole configuration back to a string
- `parse(string)` — Convert a plain string into a raw config object

For example, to override in Node:

```js
import { Configuration, NodeConfiguration } from "@gruber/node";
import Yaml from "yaml";

const config = new Configuration({
	...NodeConfiguration.getOptions(),
	getEnvionmentVariable: () => undefined,
	stringify: (v) => Yaml.stringify(v),
	parse: (v) => Yaml.parse(v),
	readTextFile: (url) => fetch(url).then((r) => r.text()),
});
```

This example:

- Disables loading environment variables
- Uses YAML instead of JSON encoding
- Fetches text files over HTTP (just because)

### Migrator API

The migrator is similarly abstracted to [Configuration](#configuration-api).
Where the postgres migrator is an subclass of `Migrator`.
This class has the base methods to run migrations up or down and knows which migrations to run.

```js
import fs from "node:fs/promises";
import { defineMigration } from "@gruber/node";

async function getRecords() {
	try {
		return JSON.parse(await fs.readFile("./migrations.json"));
	} catch {
		return {};
	}
}

async function writeRecords(records) {
	await fs.writeFile("./migrations.json", JSON.stringify(records));
}

async function getDefinitions() {
	return [
		defineMigration({
			up: (fs) => fs.writeFile("hello.txt", "Hello, World!"),
			down: (fs) => fs.unlink("hello.txt"),
		}),
		defineMigration({
			up: (fs) => fs.writeFile("version.json", '{ "version": "0.1" }'),
			down: (fs) => fs.unlink("version.json"),
		}),
	];
}

async function executeUp(name, fn) {
	console.log("migrate up", name);
	await fn(fs);
	const records = await getRecords();
	records[name] = true;
	await writeRecords(records);
}
async function executeDown(name, fn) {
	console.log("migrate down", name);
	await fn(fs);
	const records = await getRecords();
	delete records[name];
	await writeRecords(records);
}

export function getMigrator() {
	return new Migrator({
		getDefinitions,
		getRecords,
		executeUp,
		executeDown,
	});
}
```

This is an example migrator that does things with the filesystem.
It has a store of records at `migrations.json` to keep track of which have been run.
When it runs the migrations it'll update the json file to reflect that.

---

<!-- -->
<!-- -->
<!-- -->
<!-- -->
<!-- -->

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

## Rob's notes

- should exposing `appConfig` be a best practice?
- what other types of `Migrator` could there be, is it worth the abstraction?
- ways of passing extra migrations to the Migrator ie from a module
- what if you wanted configuration in a different language?
- `core` tests are deno because it's hard to do both and Deno is more web-standards based
- json schema for configuration specs;
- load different configuration files?
- note or info about loading dot-env files
- explain functional approach more and use of it instead of middleware
- document `HTTPError`
- `defineRouteGroup` type primative for grouping routes together
- Something like the `res/` directory of files loaded into memory for use
- Migration logging to stdout
