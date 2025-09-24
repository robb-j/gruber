---
layout: api.njk
eleventyNavigation:
  key: HTTP
  order: 3
api:
  entrypoint: http/mod.ts
---

# HTTP

The HTTP module is all about the integration with a platform's HTTP server.
It creates a common standards-based layer for agnostic servers
and also provides nice abstractions for other parts of Gruber to consume.

The module is based around route definitions created with [defineRoute](#defineroute).
This pulls together a few standards to make a route definition that you can easily pass around.

- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) Request & Response objects
- [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) objects
- [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URL) for route matching

```js
import { defineRoute } from "gruber";

// A route is a first-class thing, it can easily be passed around and used
export const helloRoute = defineRoute({
  method: "GET",
  pathname: "/hello/:name",
  handler({ params }) {
    return new Response(`Hello, ${params.name}!`);
  },
});
```

Once you have a few routes, they can be passed to a [FetchRouter](#fetchrouter)
to serve them.

```js
import { FetchRouter } from "gruber";
import { helloRoute } from "./hello-route.ts";

const router = new FetchRouter({
  routes: [helloRoute],
});
```

Depending on the platform you're running on you can use the `FetchRouter` with the platform's HTTP server.
See [Deno](/deno/#http) or [Node.js](/node/#http) for more.

Other notable parts of the HTTP module are:

- [CORS](#cors) — a development utility for applying CORS headers
- [ServerSentEventStream](#serversenteventstream) — for streaming [Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) responses using the [Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [HTTPError](#httperror) — a custom error subclass for throwing HTTP errors directly in routes

There is an **unstable** [AuthorizationService](#authorizationservice) for checking request authorization.
