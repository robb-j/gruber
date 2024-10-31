// Adapted from the README.md

// Usage:
// node examples/node/server.js

import "gruber/polyfill.js";

import { createServer } from "node:http";
import { defineRoute, HTTPError, NodeRouter } from "gruber/mod.js";

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

async function runServer(options) {
	const router = new NodeRouter({ routes });
	const server = createServer(router.forHttpServer());

	server.listen(options, () => {
		console.log("Listening on http://%s:%d", options.hostname, options.port);
	});
}

runServer({ port: 3000, hostname: "127.0.0.1" });
