# Gruber

An isomorphic JavaScript library for creating web apps.

> Named for [Hans](https://purl.r0b.io/gruber)

## Contents

- [About](#about)
- [Install](#install)
- [HTTP server](#http-server) — Creating and structuring HTTP routes
- [Configuration](#configuration) – Define configuration for apps
- [Migrations](#migrations) — Run procedures in an organised fashion
- [Testing](#testing) — Make sure your code works
- [Core library](#core-library) — Other utilities available in Gruber
- [Meta APIs](#meta-apis) — Use Gruber in different ways
- [Node.js library](#nodejs-library) — Stuff just for Node.js servers

## Foreword

This is very much a WIP library, it started out as a documentation-driven-development project and I've slowly been building it.
The various ideas it's composed of have been floating around in my mind for a year or so and writing this has helped explore those ideas.

## About

Gruber is a library of composable utilities for creating isomorphic JavaScript applications,
that means web-standards JavaScript on the front- and backend.
It's bet is that web-standards aren't going to change, so it best to be based around them to create apps that don't break in the future.
There's also a hope that [WinterCG](https://wintercg.org/work) works some stuff out.

Gruber acknowledges that web-standards don't do everything we want (yet) and that they aren't implemented properly everwhere.
For this reason, the core of Gruber is agnostic but there are helpers for using common runtimes & libraries with the core.

Gruber itself is a library and can be used however you like. The rest is **patterns** which you can apply if you like.
Patterns are ways of structuring your code if you don't already have opinions on the matter.
They also help to explain why Gruber is made in the way it is.

With a common agnostic core, there can be modules built on top that can be used agnostically too.
If the modules themselves are agnostic of course.

There is a lot not in Gruber too. By design things like CORs should be implemented at a higher networking level.
A Gruber app should be run behind a reverse proxy and that can do those things for you.

### Background

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

### Focus

- `URLPattern` based routing that is testable
- `fetch` based routes using [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
  and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)
- Basic only-run-once migrations up & down
- Configuration to control how apps work
- Structures to validate data and provide types
- A common core for reusable modules to built be upon

### Design goals

- Composability — logic should be composed together rather than messily intertwined
- Standards based — where available existing standards should be applied or migrated towards
- Agnostic — a frontend framework or backend runtime shouldn't be forced upon you
- Patterns — how you _could_ use modules rather than enforce an implementation
- Minimal — start small, carefully add features and consider removing them
- No magic — it's confusing when you don't know whats going on

## Install

**Node.js**

Gruber is available on NPM as [gruber](https://www.npmjs.com/package/gruber).

```bash
# cd to/your/project
npm install gruber
```

**Deno**

Gruber is available at `esm.r0b.io/gruber@VERSION/mod.ts`, add it to your _deno.json_:

> Replace `VERSION` with the one you want to use, maybe see [Releases](https://github.com/robb-j/gruber/releases).

```json
{
	"imports": {
		"gruber/": "https://esm.r0b.io/gruber@VERSION/"
	}
}
```

Then use it like this:

```js
import { defineRoute } from "gruber/mod.ts";
```

## HTTP server

First a HTTP route to do something:

**hello-route.js**

```js
import { defineRoute, HttpError } from "gruber";

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

A route is a definition to handle a specific HTTP request with a response.
It defines which method and path it is responding to and an asynchronous function to handle the request.

Both the [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)
are from the web Fetch API.

There is also a `url` (as a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)) of the request and `params`.
The parameters, `params`, are matched from the pathname, part of the result of [URLPattern.exec](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern/exec).
In this example `name` is matched in the request URL and is used to process the request.

Let's add the route to a Node.js server:

**server.js**

```js
import { createServer } from "node:http";
import { NodeRouter } from "gruber";

import helloRoute from "./hello-route.js";

export const routes = [helloRoute];

export async function runServer(options) {
	const router = new NodeRouter({ routes });
	const server = createServer(router.forHttpServer());

	await new Promise((resolve) => server.listen(options.port, resolve));
	console.log("Listening on http://localhost:%d", options.port);
}
```

If you were using Deno, the same server would look like:

```js
import { DenoRouter } from "gruber/mod.js";

import helloRoute from "./hello-route.js";

export const routes = [helloRoute];

export async function runServer(options) {
	const router = new DenoRouter({ routes });

	Deno.serve({ port: options.port }, router.forDenoServe());
}
```

That's how the same HTTP logic can be run on Deno and Node.
Gruber doesn't expect you'll change runtime during a project,
but now you can have more-common-looking code on different projects.

Back in Node.js, next you could add a cli with [yargs](https://www.npmjs.com/package/yargs):

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

**a terminator**

For highly available deployments and/or where you want a zero downtime deployment,
you might run your server behind a load balancer.
When a deployment goes out you run both instances at the same time
and instantly switch traffic at the network level when the new deployment is up and running.

To help with this your app often implements a `/healthz`-type endpoint that returns when your app is accepting network connections
or if it is terminating existing connections ready to be descheduled.
Terminator is here to help with this use-case.

```js
import { DenoRouter, getTerminator } from "gruber";

import { appConfig } from "./config.js";
import helloRoute from "./hello-route.js";

// 1. Create your Terminator, maybe call them arnie
export const terminator = getTerminator({
	timeout: appConfig.env === "development" ? 0 : 5_000,
});

// 2. Define the health endpoint
const healthzRoute = defineRoute({
	method: "GET",
	pathname: "/healthz",
	handler: () => terminator.getResponse(),
});

export const routes = [helloRoute, healthzRoute];

export async function runServer(options) {
	const router = new DenoRouter({ routes });

	const server = Deno.serve({ port: options.port }, router.forDenoServe());

	// 3. Start the terminator and define the shutdown procedure
	terminus.start(async () => {
		await server.shutdown();
		// Perform clean-up
		// Close the database connection
		// ...
	});
}
```

> You might want to have this in separate files, this is just to easily document it in one place.

By default Terminator waits 5 seconds to terminate and listens for `SIGINT` and `SIGTERM`.
A nice pattern is to skip waiting in development, shown above.

## Configuration

In production, it's very useful to be able to configure how an app behaves without having to modify the code and redeploy the entire thing.
That is what configuration is for. It lets you change how the app works by running it with different configuration.
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
It uses a pattern of `cli args > environment variables > configuration file > fallback` to decide which values to use.
The end result is a configuration object you can share between all of your code that you know is well-formed.

Configuration is heavily inspired by [superstruct](https://docs.superstructjs.org/) which has a lovely API.

Building on the [HTTP server](#http-server) above, we'll setup configuration. Still using Node.

**config.js**

```js
import fs from "node:fs";
import { getConfiguration } from "gruber";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const config = getConfiguration();

const struct = config.object({
	env: config.string({ variable: "NODE_ENV", fallback: "development" }),

	port: config.number({
		variable: "APP_PORT",
		flag: "--port",
		fallback: 8000,
	}),

	selfUrl: config.url({
		variable: "SELF_URL",
		fallback: "http://localhost:3000",
	}),

	meta: config.object({
		name: config.string({ flag: "--app-name", fallback: pkg.name }),
		version: config.string({ fallback: pkg.version }),
	}),

	database: config.object({
		useSsl: config.boolean({ flag: "--database-ssl", fallback: true }),
		url: config.url({
			variable: "DATABASE_URL",
			flag: "--database-url",
			fallback: "postgres://user:secret@localhost:5432/database",
		}),
	}),
});

// Load the configuration and parse it
export function loadConfiguration(path) {
	return config.load(path, struct);
}

// The configutation for use in the application
export const appConfig = await loadConfiguration(
	new URL("./config.json", import.meta.url),
);

// A method to generate usage documentation
export function getConfigurationUsage() {
	return config.getUsage(struct, appConfig);
}

// A method to generate a JSON Schema for the configuration
export function getConfigurationSchema() {
	return config.getJSONSchema(struct);
}
```

### Usage info

By defining the configuration like this, you can easily load a strongly typed configuration object that is self documenting.
If you output the usage information you will get:

```
Usage:

| name            | type    | flag           | variable     | fallback                                       |
| --------------- | ------- | -------------- | ------------ | ---------------------------------------------- |
| database.url    | url     | --database-url | DATABASE_URL | postgres://user:secret@localhost:5432/database |
| database.useSsl | boolean | --database-ssl | ~            | true                                           |
| env             | string  | ~              | NODE_ENV     | development                                    |
| meta.name       | string  | --app-name     | ~            | gruber-app                                     |
| meta.version    | string  | ~              | ~            | 1.2.3                                          |
| port            | number  | --port         | APP_PORT     | 8000                                           |
| selfUrl         | url     | ~              | SELF_URL     | http://localhost:3000/                         |


Default:
{
  "env": "development",
  "port": 8000,
  "selfUrl": "http://localhost:3000/",
  "meta": {
    "name": "gruber-app",
    "version": "1.2.3"
  },
  "database": {
    "useSsl": true,
    "url": "postgres://user:secret@localhost:5432/database"
  }
}
```

### Fallbacks

You can provide a configuration file like **config.json** to load through the config specification:

```json
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

### Considerations

You should to consider the security for your default values,
e.g. if you app runs differently under NODE_ENV=production
and you forget to set it, what is the implication?

If you use something like `dotenv`, ensure it has already loaded before creating the configuration.

You could add extra checks to `loadConfiguration` to ensure things are correct in production,
this can be done like so:

```js
export function loadConfiguration() {
	const appConfig = config.loadJsonSync(path, struct);

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

### Configuration commands

We can add a CLI command to demonstrate using this configuration.
Add this command to **cli.js**, below the "serve" command":

```ts
import { appConfig, getConfigurationUsage } from "./config.js";

// cli.command('serve', ...

cli.command(
	"config",
	"outputs computed configuration and usage information",
	(yargs) => yargs,
	(args) => {
		console.log(getConfigurationUsage());
	},
);
```

## Migrations

Building on [Configuration](#configuration), we'll add database migrations to our Gruber app.

Migrations are a directory of JavaScript or (TypeScript in Deno) that are designed to be run in alphabetical order.
A migration is made up of an "up" and "down" function, one to do the change, one to undo it.
Each migration will only be ran once, so you don't try to create the same table twice.

First, lets create a migration, **migrations/001-add-people.js**:

```js
import { defineMigration } from "gruber";

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

> `defineMigration` is generic but there is `definePostgresMigration` too

and we need to set up our database with **database.js**

```js
import process from "node:process";
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

> `loader` is a utility to run a function once and cache the result for subsequent calls.
> It returns a method that either calls the factory function or returns the cached result.
> The name could be better.

### Migrate command

Then we can add to our CLI again, **cli.js**:

```ts
import { getMigrator } from "./database.js";

// cli.command("config", ...

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

With that in place, you can run the migrations.
Gruber internally will set up the migration infrastructure too.

The `Migrator` is agnostic and provides a bespoke integration with [postgres.js](https://github.com/porsager/postgres).
When used agnostically, it facilitates the preperation and running of migrations.
With postgres, it uses that facilitation to add a `migrations` table to track which have been run and execute new ones.

## Testing

Let's write a test for our route.

**hello-route.test.js**

```js
import assert from "node:assert";
import { describe, it } from "node:test";

import { NodeRouter } from "gruber";
import helloRoute from "./hello-route.js";

describe("hello route", () => {
	const router = new NodeRouter({ routes: [helloRoute] });

	it("uses GET", () => {
		assert.equal(helloRoute.method, "GET");
	});
	it("says hello", async () => {
		const response = await router.getResponse(new Request("/hello/Geoff"));
		assert.equal(response.status, 200);
		assert.equal(await response.text(), "Hello, Geoff!");
	});
	it("blocks McClane", async () => {
		const response = await router.getResponse(new Request("/hello/McClane"));
		assert.equal(response.status, 401);
	});
});
```

You use the same `Request` & `Response` objects to test your code!
No need for mock servers.

Next testing routes when there is a dependency (e.g. a database)

**search-route.js**

```js
import { defineRoute } from "gruber";
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
import { NodeServer, magicLoad } from "gruber";

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

		const response = await router.getResponse(request);
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
import { defineRoute } from "gruber";
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

## Core library

### HTTP

#### defineRoute

`defineRoute` is the way of creating route primatives to be passed to your router to handle web traffic.

```js
import { defineRoute } from "gruber";

export const helloRoute = defineRoute({
	method: "GET",
	pathname: "/hello/:name",
	handler({ request, url, params }) {
		if (params.name === "McClane") {
			throw HTTPError.unauthorized();
		}
		return new Response(`Hello, ${params.name}!`);
	},
});
```

#### HTTPError

`HTTPError` is an Error subclass with specific information about HTTP errors.
Gruber catches these errors and converts them into HTTP Responses.

```js
import { HTTPError } from "gruber";

throw HTTPError.badRequest();
throw HTTPError.unauthorized();
throw HTTPError.notFound();
throw HTTPError.internalServerError();
throw HTTPError.notImplemented();
```

The static methods are implemented on an "as-needed" basis,
more can be added in the future as the need arrises.
They directly map to HTTP error as codes documented on [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).

```js
import { HTTPError } from "gruber";

const teapot = new HTTPError(418, "I'm a teapot");
```

You can also instantiate your own instance with whatever status code and text you like.
With an instance, you can ask it to create a Response for you.

```js
teapot.toResponse();
```

**Request body**

You can set the body to be returned when the HTTPError is thrown from the constructor or the factory methods:

```ts
import { HTTPError } from "gruber";

const teapot = new HTTPError(418, "I'm a teapot", "model=teabot-5000");

throw HTTPError.badRequest("no coffee provided");
```

The value of the body is the same as the `body` in the
[Response constructor](https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#body).

**Headers**

> _EXPERIMENTAL_

If you really want, you can set headers on a HTTPError too:

```ts
import { HTTPError } from "gruber";

const teapot = new HTTPError(
	400,
	"Bad Request",
	JSON.stringify({ some: "thing" }),
	{ "Content-Type": "application/json" },
);

// or via mutating the headers object
teapot.headers.set("X-HOTEL-BAR", "Hotel Bar?");
```

> The argument for `HTTPError` is aany [headers init](https://developer.mozilla.org/en-US/docs/Web/API/Headers/Headers) value that gets passed to the Headers constructor.

If you want fine-grain control, you might be better off creating a subclass, e.g. `BadJSONRequest`:

```ts
class BadJSONRequest extends HTTPError {
	constructor(body) {
		super(400, "Bad Request", body, { "Content-type": "application/json" });
		this.name = "BadJSONRequest";
		Error.captureStackTrace(this, BadJSONRequest);
	}
}

throw new BadJSONRequest({ message: "Something went wrong..." });
```

#### FetchRouter

`FetchRouter` is a web-native router for routes defined with `defineRoute`.

```js
import { FetchRouter, defineRoute } from "gruber";

const routes = [defineRoute("..."), defineRoute("..."), defineRoute("...")];

const router = new FetchRouter({
	routes,
	errorHandler(error, request) {
		console.log("Route error", error);
	},
});
```

All options to the `FetchRouter` constructor are optional and you can create a router without any options if you want.

`routes` are the route definitions you want the router to processes, the router will handle a request based on the first route that matches.
So order is important.

`errorHandler` is called if a non-`HTTPError` or a 5xx `HTTPError` is thrown.
It is called with the offending error and the request it is associated with.

> NOTE: The `errorHandler` could do more in the future, like create it's own Response or mutate the existing response.
> This has not been designed and is left open to future development if it becomes important.

**getResponse**

`getResponse` is the main method on a router.
Use it to get a `Response` from the provided request, based on the router's route definitions.

```js
const response = await router.getResponse(new Request("http://localhost"));
```

**experimental**

- `options.log` turn on HTTP logging with `true` or a custom
- `options.cors` apply CORS headers with a [Cors](#cors) instance

#### unstable http

There are some unstable internal methods too:

- `findMatchingRoutes(request)` is a generator function to get the first route definition that matches the supplied request. It's a generator so as few routes are matched as possible and execution can be stopped if you like.
- `processMatches(request, matches)` attempts to get a `Response` from a request and an Iterator of route definitions.
- `handleError(error, request)` converts a error into a Response and triggers the `errorHandler`
- `getRequestBody(request)` Get the JSON of FormData body of a request
- `assertRequestBody(struct, body)` Assert the body matches a structure and return the parsed value

#### Cors

There is an unstable API for applying [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) headers to responses.

```ts
import { Cors } from "gruber";

const cors = new Cors({
	credentials: true,
	origins: ["http://localhost:8080"],
});

const response = cors.apply(
	new Request("http://localhsot:8000"),
	new Response("ok"),
);
```

It returns a clone of the response passed to it with CORS headers applied. You should no longer use the response passed into it. The headers it applies are:

- `Access-Control-Allow-Methods` set to `GET, HEAD, PUT, PATCH, POST, DELETE`
- `Access-Control-Allow-Headers` mirrors what is set on `Access-Control-Request-Headers` and adds that to `Vary`
- `Access-Control-Allow-Origin` allows the `Origin` if it matches the `origins` parameter
- `Access-Control-Allow-Credentials` is set to `true` if the `credentials` parameter is

### Postgres

#### getPostgresMigratorOptions

`getPostgresMigratorOptions` generates the default options for a `PostgresMigrator`.
You can use it and override parts of it to customise how the postgres migrator works.

### Structure

This is an internal primative for validating objects, strings, numbers and URLs for use in [Configuration](#configuration).
It is based on a very specific use of [superstruct](https://github.com/ianstormtaylor/superstruct) which it made sense to internalise to make the code base more portable.
A `Structure` is a type that validates a value is correct by throwing an error if validation fails, i.e. the wrong type is passed.
Every struct has an intrinsic `fallback` so that if no value (`undefined`) is passed, that is used instead.

```js
import { Structure } from "gruber/structures.js";

// A string primative, or use "Geoff Testington" if no value is passed.
const name = Structure.string("Geoff Testington");

// A URL instance or a string that contains a valid URL, always converting to a URL
const website = Structure.url("https://example.com");

// A number primative, falling back to 42
const age = Structure.number(42);

// A boolean primative, falling back true
const hasPets = Structure.boolean(true);

// An object with all of the fields above and nothing else
// defaulting to create { name: "Geoff..", age: 42, website: "https..." } with the same fallback values
const person = Structure.object({ name, age, website });

// Process the Structure and get a value out. The returned value is strongly typed!
// This will throw a StructError if the value passed does not match the schema.
const value = person.process(/* ... */);
```

Those static Structure methods return a `Structure` instance. These are the different types:

- `Structure.string(fallback)` — A string primative
- `Structure.number(fallback)` — A number primative
- `Structure.boolean(fallback)` — A boolean primative
- `Structure.literal(value)` — **unstable** — A specific string/number/boolean value
- `Structure.url(fallback)` — A valid url for the [URL constructor](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL)
- `Structure.object(value)` — An object of other structures
- `Structure.array(struct)` — **unstable** — An array of a structure
- `Structure.union(structs)` — **unstable** — Exactly one of the structures

You can also create your own types with the constructor. This example shows how to do that, and also starts to unveil how the internals work a bit with [StructError](#structerror).

```js
import { Structure, StructError } from "gruber/structures.js";

// Create a new boolean structure (this should probably be included as Structure.boolean tbh)
const boolean = new Structure(
	{ type: "boolean", default: false },
	(input, context) => {
		if (input === undefined) return false;
		if (typeof input !== "boolean") {
			throw new StructError("Expected a boolean", context?.path);
		}
		return input;
	},
);
```

To create a custom Structure, you give it a [JSON schema](https://json-schema.org/) and a "process" function.
The function is called to validate a value against the structure. It should return the processed value or throw a `StructError`.

The `context` object might not be set and this means the struct is at the root level. If it is nested in an `object` then the context contains the path that the struct is located at, all the way from the root object. That path is expressed as an array of strings. That path is used to generate friendlier error messages to explain which nested field failed.

With a Structure, you can generate a JSON Schema:

```js
import { Structure } from "gruber/structures.js";

const person = Structure.object({
	name: Structure.string("Geoff Testington"),
	age: Structure.number(42),
	website: Structure.url("https://example.com"),
});

console.log(JSON.stringify(person.getSchema(), null, 2));
```

This is a bit WIP, but you could use this to generate a JSON schema to lint configurations in your IDE.

#### StructError

This Error subclass contains extra information about why parsing a `Structure` failed.

- The `message` field is a description of what went wrong, in the context of the structure.
- An extra `path` field exists to describe the path from the root object to get to this failed structure
- `children` is also available to let a structure have multiple child errors, i.e. for an object to have failures for each of the fields that have failed.

On the error, there are also methods to help use it:

- `toFriendlyString` goes through all nested failures and outputs a single message to describe everything that went wrong.
- `getOneLiner` converts the error to a succint one-line error message, concatentating the path and message
- `[Symbol.iterator]` is also available if you want to loop through all children nodes, only those that do not have children themselves.

There is also the static method `StructError.chain(error, context)` which is useful for catching errors and applying a context to them (if they are not already a StructError).

### Terminator

Terminator helps you gracefully deploy servers with zero downtime when using a load balancer.

```js
import { Terminator } from "gruber/terminator.js";

// All options are optional, these are also the defaults
const arnie = getTerminator({
	signals: ["SIGINT", "SIGTERM"],
	timeout: 5_000, // perhaps: appConfig.env === 'development' ? 0 : 5_000
});

// Generate a HTTP response based on the current state of the Terminator
// A 200 if running or 503 if terminating
const response = arnie.getResponse();

// Get the current state of the Terminator, either 'running' or 'terminating'
arnie.state;

// Start the Terminator process and define the shutdown procedure
arnie.start(async () => {
	// shut down things like HTTP servers or database connections
});
```

The block passed to `start` can be async and it handles errors by logging them and exiting with a non-zero status code.

### Store

> UNSTABLE

The Store is for when you have values that you want to remember under certain keys.
It is an abstract interface over that so there can be multiple implementations
for different storage methods and so it can be inter-operated between different services.

While some implementations may be sync, the interface is based on async so both can co-exist.

There is a rough idea of using absolute paths, e.g. `/some/absolute/path`
and some stores may offer a "prefix" option to allow multi-tennancy
so the store internally could put it at `/v1/some/absolute/path`.

```ts
import { MemoryStore } from "gruber";

const store = new MemoryStore();

// Put geoff in the store
await store.set("/some/key", { name: "Geoff Testington", age: 42 });

// Put something in the store, just for a bit
await store.set(
	"/login/55",
	{ token: "abcdef" },
	{ maxAge: 30 * 1_000 /* 30 seconds */ },
);

// Retrieve geoff, types optional
const geoff = await store.get<GeoffRecord>("/some/key");

// Ok, time for geoff to go
await store.delete("/some/key");
```

The store is meant for temporary resources, so its mostly meant to be called with the `maxAge` option

> The `MemoryStore` is also useful for testing, you can provide a TimerService to mock time

There are these experimental stores too:

```ts
import { PostgresStore, RedisStore } from "gruber";
import { Sql } from "postgres";
import { RedisClientType } from "redis";

const sql: Sql;
const store = new PostgresStore(sql, { tableName: "cache" });

const redis: RedisClientType;
const store = new RedisStore(redis, { prefix: "/v2" });
```

### Tokens

An abstraction around signing or storing a token for a user with an access scope.
There is currently one implementation using [jose](https://github.com/panva/jose).

```ts
import { JoseTokens } from "gruber";
import * as jose from "jose";

const jwt = new JoseTokens(
	{
		secret: "top_secret",
		issuer: "myapp.io",
		audience: "myapp.io",
	},
	jose,
);

// string
const token = await jwt.sign("user:books:read", {
	userId: 1,
	maxAge: 30 * 24 * 60 * 60 * 1_000, // 30 days
});

// { userId, scope } or null
const parsed = await jwt.verify(token);
```

There is also `CompositeTokens` which lets you combine multiple verifiers with one signer.
For example, if your app has several methods a client might authenticate and one way it itself signs things,
like a user token, or a static service or database app-token.

> UNSTABLE

```ts
import { CompositeTokens, JoseTokens } from "gruber";
import * as jose from "jose";

const tokens = new CompositeTokens(new JoseTokens("..."), [
	new JoseTokens("..."),
	// Different token formats your app accepts
]);
```

### Authorization

> UNSTABLE

A module for checking Request objects have authorization to perform actions on the server

```ts
import { TokenService, AuthorizationService, includesScope } from "gruber";

const tokens: TokenService;
const authz = new AuthorizationService({ cookieName: "my_session" }, tokens);

// string | null
const token = authz.getAuthorization(
	new Request("https://example.com", {
		headers: { Authorization: "Bearer some-long-secure-token" },
	}),
);

// { kind: 'user', userId: number , scope: string } | { kind: 'service', scope: string }
const result = await authz.from(
	new Request("https://example.com", {
		headers: { Authorization: "Bearer some-long-secure-token" },
	}),
);

// { kind: 'user', userId: number , scope: string } | { kind: 'service', scope: string }
const { userId, scope } = await authz.assert(
	new Request("https://example.com", {
		headers: { Authorization: "Bearer some-long-secure-token" },
	}),
	{ scope: "repo:coffee-club" }, // optional
);

// { kind: 'user', userId: number, scope: string }
const { userId, scope } = await authz.assertUser(
	new Request("https://example.com", {
		headers: { Cookie: "my_session=some-long-secure-token" },
	}),
	{ scope: "user:books:read" }, // optional
);

includesScope("user:books:read", "user:books:read"); // true
includesScope("user:books", "user:books:read"); // true
includesScope("user", "user:books:read"); // true
includesScope("user", "user:podcasts"); // true
includesScope("user:books", "user:podcasts"); // false
```

Any of these methods will throw a `HTTPError.unauthorized` (a 401) if the authorization is not present or invalid.

**scopes**

Scopes are abstract hierarchical access to things in your application.
They are checked from left to right, so if the request has the top-level it allows access to scopes beneath it.
There is also the special `admin` scope which has access to all resources.

The idea is you might check for `user:books:write` inside a request handler against the scope the request is authorized with. When the user signed in or created that access token, it might only have `user:bookes:read` so now we know they cannot perform this request.

### Authentication

> VERY UNSTABLE

Authentication provides a service to help users get authorization to use the application.

```ts
import {
	AuthenticationService,
	Store,
	RandomService,
	JWTService,
} from "gruber";

const store: Store;
const jwt: JWTService;
const random: RandomService; // OR // = useRandom()
const options = {
	allowedHosts: () => [new URL("https://example.com")],
	cookieName: "my_session",
	sessionDuration: 30 * 24 * 60 * 60 * 1_000, // 30 days
	loginDuration: 15 * 60 * 1_000, // 15 minutes
};

const authn = new AuthenticationService(options, store, random, jwt);

// Get the token and code the user must match to complete the authentication
// These could be sent in a magic link perhaps
const { token, code } = await authn.start(userId, redirectUrl);

// Use a user-provided token & code to check if they are a valid log in
const login = await authn.check(token, code);

// If valid, complete the authentication and get back their redirect,
// headers to set the authz cookie and their raw token too
const { token, headers, redirect } = await authn.finish(login);
```

These would obviously be spread accross multiple endpoints and you transfer
the token / code combination to the user in a way that proves they are who they claim to be.

### Server Sent Events

Gruber includes utilities for sending [Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) from regular route definitions.

```ts
import { defineRoute, ServerSentEventStream, sseHeaders } from "gruber";

const stream = defineRoute({
	method: "GET",
	pathname: "/stream",
	async handler({ request }) {
		let counter = 0;
		let timerId = null;

		// Create a stream to pipe data to the response,
		// it sends an incrementing counter every second
		const stream = new ReadableStream({
			start(controller) {
				timerId = setInterval(() => {
					counter++;
					controller.enqueue({ data: JSON.stringify({ counter }) });
				}, 1_000);
			},
			cancel() {
				if (timerId) clearInterval(timerId);
			},
		});

		// Create a response that transforms the stream into an SSE body
		return new Response(stream.pipeThrough(new ServerSentEventStream()), {
			headers: {
				"content-type": "text/event-stream",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	},
});
```

> You might want to use [ReadableStream.from](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/from_static) to create the stream

#### ServerSentEventMessage

`ServerSentEventMessage` is an interface for the payload to be delivered to the client.

#### ServerSentEventStream

`ServerSentEventStream` is a [TransformStream]() that converts `ServerSentEventMessage` into the raw bytes to send to a client.

### Utilities

#### loader

`loader` let's you memoize the result of a function to create a singleton from it.
It works synchronously or with promises.

```js
import { loader } from "gruber";

const useRedis = loader(async () => {
	return "connect to the database somehow...";
});

// Then elsewhere
const redis = await useRedis();
```

#### formatMarkdownTable

`formatMarkdownTable` generates a pretty markdown table based on an array of rows and the desired column names.

```js
import { formatMarkdownTable } from "gruber";

const table = formatMarkdownTable(
	[
		{ name: "Geoff Testington", age: 42 },
		{ name: "Jess Smith", age: 32 },
		{ name: "Tyler Rockwell" },
	],
	["name", "age"],
	"~",
);
```

This will generate the table:

```
| name             | age |
| ---------------- | --- |
| Geoff Testington | 42  |
| Jess Smith       | 32  |
| Tyler Rockwell   | ~   |
```

#### trimIndentation

`trimIndentation` takes a template literal (with values) and takes out the common whitespace.
Very heavily based on [dedent](https://github.com/dmnd/dedent/tree/main)

```js
import { trimIndentation } from "gruber";

console.log(
	trimIndentation`
		Hello there!
		My name is Geoff
	`,
);
```

Which will output this, without any extra whitespace:

```
Hello there!
My name is Geoff
```

## Meta APIs

There are APIs within Gruber for using it at a meta level.
That means internal interfaces for using Gruber in different ways than the patterns above.

### Configuration API

The Configuration class is the base for how configuration works and can be used by itself to make you configuration work in different ways.

To see how it works, look at the [Node](./node/source/configuration.js) and [Deno](./deno/configuration.ts) implementations.

You can use the static `getOptions` method both subclasses provide and override the parts you want.
These are the options:

- `readTextFile(url)` — How to load a text file from the file system
- `getEnvironmentVariable(key)` — Return a matching environment "variable" for a key
- `getCommandArgument(key)` — Get the corresponding "flag" from a CLI argument
- `stringify(value)` — How to write the whole configuration back to a string
- `parse(string)` — Convert a plain string into a raw config object

For example, to override in Node:

```js
import { Configuration, getConfigurationOptions } from "gruber";
import Yaml from "yaml";

const config = new Configuration({
	...getConfigurationOptions(),
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
import { defineMigration } from "gruber";

async function getRecords() {
	try {
		return JSON.parse(await fs.readFile("./migrations.json"));
	} catch {
		// This _should_ only catch not-found errors
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

async function execute(definition, direction) {
	console.log("migrate %s", direction, definition.name);

	const records = await getRecords();

	if (direction === "up") {
		await definition.up(fs);
		records[name] = true;
	}
	if (direction === "down") {
		await definition.down(fs);
		delete records[name];
	}

	await writeRecords(records);
}
export function getMigrator() {
	return new Migrator({ getDefinitions, getRecords, execute });
}
```

This is an example migrator that does things with the filesystem.
It has a store of records at `migrations.json` to keep track of which have been run.
When it runs the migrations it'll update the json file to reflect that.

With the code above in place, you can use the migrator to run and undo migrations with the `up` and `down` methods on it.

## Node.js library

There are some specific helpers to help use Gruber in Node.js apps.

### KoaRouter

`KoaRouter` lets you use Gruber routes in an existing Koa application, for example:

```js
import Koa from "koa";
import helmet from "koa-helmet";
import cors from "@koa/cors";
import static from "koa-static";
import mount from "koa-mount";

import { KoaRouter } from "gruber/koa-router.js";

const router = new KoaRouter({ routes: "..." });
const app = new Koa()
	.use(helmet())
	.use(cors({ origin: "https://example.com" }))
	.use(mount("/public", koaStatic("public")))
	.use(router.middleware());

app.listen(3000);
```

### ExpressRouter

`ExpressRouter` lets you use Gruber routes in an Express application, for example:

```js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { ExpressRouter } from "gruber/express-router.js";

const router = new ExpressRouter({ routes: "..." });
const app = express()
	.use(helmet())
	.use(cors())
	.use(morgan("tiny"))
	.use(router.middleware());

app.listen(3000);
```

### Polyfil

For older version of Node.js that don't support the latest web-standards,
there is a polyfil import you can use to add support for them to your runtime.

```js
import "gruber/polyfill.js";
```

This currently polyfils these APIs:

- [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)
  using [urlpattern-polyfill](https://www.npmjs.com/package/urlpattern-polyfill)

### HTTP helpers

There are a bunch of methods to help deal with Node's `http` library, like converting to `Request` and `Response objects`

#### getFetchRequest

`getFetchRequest` converts a node [http.IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage) into a [Fetch API Request](https://developer.mozilla.org/en-US/docs/Web/API/Request).

```js
import http from "node:http";
import { getFetchRequest } from "gruber/node-router.js";

const server = http.createServer(async (req, res) => {
	const request = getFetchRequest(req);
	res.send(await req.text());
});
```

#### getFetchHeaders

`getFetchHeaders` converts a `http.IncomingHttpHeaders` into a [Fetch API Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) object.

```js
import { getFetchHeaders } from "gruber/node-router.js";

const headers = getFetchHeaders({
	accept: "text/html",
	"set-cookie": ["bourbon=yummy", "digestive=nice"],
	"content-type": "application/json",
});
```

#### getIncomingMessageBody

`getIncomingMessageBody` gets the body of a [http.IncomingMessage](https://nodejs.org/api/http.html#class-httpincomingmessage) as a [Steams API ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

```js
import http from "node:http";
import { getIncomingMessageBody } from "gruber/node-router.js";

const server = http.createServer((req) => {
	const stream = getIncomingMessageBody(req);
	// ...
});
```

#### getResponseReadable

`getResponseReadable` creates a [streams:Readable](https://nodejs.org/api/stream.html#class-streamreadable) from the body of a fetch Response.

```js
import http from "node:http";
import { getResponseReadable } from "gruber/node-router.js";

const server = http.createServer((req, res) => {
	const readable = getResponseReadable(new Response("some body"), res);
});
```

Pass in `res` if you want the readable to be cancelled if reading the response is aborted.

> NOTE: This relies on the **experimental** [Readable.fromWeb](https://nodejs.org/api/stream.html#streamreadablefromwebreadablestream-options)

## Development

WIP stuff

### Release process

1. Generate a new version at the root with `npm version <version>`
2. Run the bundle `./bundle.js`
3. Publish the node module
   1. `cd bundle/node`
   2. `npm publish`
4. Copy the deno source to the S3 bucket — `bundle/deno` → `esm.r0b.io/gruber@VERSION/`

### nice snippets

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
	timers = window,
	maxRetries = 20,
	interval = 1_000,
	handler,
}) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			const result = await handler();
			return result;
		} catch {
			await new Promise((r) => timers.setTimeout(r, i * interval));
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

- `core` tests are deno because it's hard to do both and Deno is more web-standards based
- explain functional approach more and use of it instead of middleware
- `defineRouteGroup` type primative for grouping routes together
- Something like a `res/` directory of files loaded into memory for use
- Migration logging to stdout
- Can configuration be done without superstruct?
- Improve the Migrator API, e.g. run "n" migrations or an external set
