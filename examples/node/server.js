// Adapted from the README.md

import { createServer } from "node:http";
import { defineRoute, HttpError, NodeRouter } from "../../node/index.js";

// A route is a first-class thing, it can easily be passed around and used
const helloRoute = defineRoute({
	method: "GET",
	pathname: "/hello/:name",
	handler({ request, url, params }) {
		console.debug("%s: %s", request.method, url.pathname, params);

		if (params.name === "McClane") {
			throw HttpError.unauthorized();
		}

		return new Response(`Hello, ${params.name}!`);
	},
});

const routes = [helloRoute];

async function runServer(options) {
	const router = new NodeRouter({ routes });
	const server = createServer(router.forHttpServer());

	await new Promise((resolve) => server.listen(options.port, resolve));
	console.log("Listening on http://localhost:%d", options.port);
}

runServer({ port: 3000 });
