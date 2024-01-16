// Adapted from the README.md

// Usage:
// deno run --allow-net examples/deno/server.js

import { DenoRouter, HTTPError, defineRoute } from "../../deno/mod.ts";

// A route is a first-class thing, it can easily be passed around and used
const helloRoute = defineRoute({
	method: "GET",
	pathname: "/hello/:name",
	handler({ request, url, params }) {
		console.debug("%s: %s", request.method, url.pathname, params);

		if (params.name === "McClane") {
			throw HTTPError.unauthorized();
		}

		return new Response(`Hello, ${params.name}!`);
	},
});

const routes = [helloRoute];

function runServer(options: { port: number }) {
	const router = new DenoRouter({ routes });
	Deno.serve({ port: options.port }, router.forServe());
}

if (import.meta.main) {
	runServer({ port: 8000 });
}
