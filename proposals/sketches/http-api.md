---
title: HTTP API
date: 2026-03-08
---

# HTTP API

With routes as a first-class primative in Gruber, they could also be used to codify the HTTP API
which can then be used to generate clients, OpenAPI specs and documentation.

There will need to be a bit of extra (opt-in) metadata added to route definitions
to define the shape of requests and responses which can be based on the `Structure` API.
Using Structures, those same values can be used to validate the requests/responses too.

These could be generated:

- HTTP Client — a strongly-typed `fetch`-based client to use the API remotely
- OpenAPI spec — a JSON specification to plumb the API into OpenAPI-related projects
- Documentation — public documentation for how to use the HTTP API.

## Design

First, extra information needs to be captured about the route
which makes this feature opt-in.

```js
import { assertRequestBody, Structure } from "gruber";

// Define what requests need to look like
const RequestBody = Structure.object({
  name: Structure.string(),
  email: Structure.string(),
});

// Define how responses will be returned
const ResponseBody = Structure.object({
  id: Structure.number(),
  created: Structure.date(),
  name: Structure.string(),
  email: Structure.string(),
});

const createUser = defineRoute({
  method: "POST",
  pathname: "/users",
  api: {
    description: `
      create a new user and put them in the database
    `,
    request: RequestBody,
    response: ResponseBody,
  },
  async handler({ request }) {
    const body = await assertRequestBody(RequestBody, request);
    // …
  },
});

export const routes = { createUser };
```

> This could also be prototyped as `defineApiRoute` to avoid polluting `defineRoute` for now.

With the `tables` proposal, those requests, responses could be simplified:

```js
const api = {
  description: "…",
  request: UserTable.structure(["name", "email"]),
  response: UserTable.structure(),
};
```

Then you can use this module to generate things.

```js
import { routes } from "./routes.ts";
import { generateFetchClient, generateOpenApiSpec } from "gruber";

if (import.meta.main) {
  const client = generateFetchClient(routes);
  console.log("");
  console.log(" === Generated JavaScript client ===");
  console.log("");
  console.log(client);

  const spec = generateOpenApiSpec(routes);
  console.log("");
  console.log(" === Generated OpenApi specification ===");
  console.log("");
  console.log(JSON.stringify(spec));
}
```

You could even serve them as routes

```js
import {
  routes,
  defineRoute,
  generateFetchClient,
  generateOpenApiSpec,
} from "gruber";

export const getClient = defineRoute({
  method: "GET",
  pathname: "/meta/client.js",
  handler() {
    return new Response(generateFetchClient(routes), {
      headers: {
        "Content-Type": "text/javascript",
      },
    });
  },
});

export const getOpenApiSpec = defineRoute({
  method: "GET",
  pathname: "/meta/open-api.json",
  handler() {
    return Response.json(generateOpenApiSpec(routes));
  },
});
```

Then you could use the client like this:

```js
import Client from "./generated-http-client.js";

// Create a new client
const client = new Client("http://example.com/api/");
client.setBearer("top_secret");

// Use one of the generated endpoints with strongly-typed parameters
const newUser = await client.createUser({
  name: "Geoff Testington",
  email: "geoff@example.com",
});

if (newUser === undefined) throw new Error("Failed to create user");
```

> NOTE: there might need to be an option to generate a JavaScript/TypeScript client
> or could the generator just do JavaScript with JSDoc comments?

Naming options:

- js client — `generateJavaScriptClient`, `generateFetchClient`, ?
- ts client — `generateTypeScriptClient`, ?
- openapi - `generateOpenApiSpec`, ?

Thoughts:

1. Should routes be passed as a record to define their name or should they be an array and define their name within the `api` section?
   Currently routes are stored as arrays to be passed to a `FetchRouter` which would clash with this.
2. With lots of routes, there might need to be some sort of grouping, perhaps defined through the `api` section?
3. Should the client be able to expose errors to the user?
4. Should the client use `null` or `undefined`?

## References

- [Make Place implementation](https://github.com/digitalinteraction/make-place/blob/8a17377e37d249172e71ce7de0f9fa26c8897df6/hack/_lib.ts)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [OpenAPI specification](https://swagger.io/specification/)

## Implementation

- [ ] Initial Sketch
- [ ] Design finalised
- [ ] Changes implemented
- [ ] Documentation created
- [ ] Testing completed
- [ ] Released
