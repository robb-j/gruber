// Adapted from the README.md

// Usage:
// NODE_ENV=development node examples/node/server.js

import "gruber/polyfill.js";

import {
	defineRoute,
	getTerminator,
	HTTPError,
	NodeRouter,
	serveHTTP,
} from "gruber";
import process from "node:process";

const terminator = getTerminator({
	timeout: process.env.NODE_ENV === "development" ? 0 : 5_000,
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

async function runServer(options) {
	const router = new NodeRouter({ routes });
	const server = await serveHTTP(options, (req) => router.getResponse(req));

	terminator.start(async () => {
		await server.stop();
	});
}

runServer({ port: 3000, hostname: "127.0.0.1" });
