// Adapted from the README.md

// Usage:
// deno run --allow-net --allow-env examples/deno/server.ts

import {
	DenoRouter,
	HTTPError,
	defineRoute,
	getTerminator,
} from "../../bundle/deno/mod.ts";

const terminator = getTerminator({
	timeout: Deno.env.get("DENO_ENV") === "development" ? 0 : 5_000,
});

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

const healthzRoute = defineRoute({
	method: "GET",
	pathname: "/healthz",
	handler: () => terminator.getResponse(),
});

const routes = [helloRoute, healthzRoute];

function runServer(options: { port: number; hostname: string }) {
	const router = new DenoRouter({ routes });
	const server = Deno.serve(options, router.forDenoServe());
	terminator.start(async () => {
		await server.shutdown();
	});
}

if (import.meta.main) {
	runServer({ port: 8000, hostname: "127.0.0.1" });
}
