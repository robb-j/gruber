// Adapted from the README.md

// Usage:
// DENO_ENV=staging deno run -A examples/deno/config.js --database-url=mysql://database

import { getConfiguration } from "../../deno/mod.ts";

const config = getConfiguration();
const meta = { name: "gruber-app", version: "1.2.3" };

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
		name: config.string({ flag: "--app-name", fallback: meta.name }),
		version: config.string({ fallback: meta.version }),
	}),

	database: config.object({
		useSsl: config.boolean({ flag: "--database-ssl", fallback: false }),
		url: config.url({
			variable: "DATABASE_URL",
			flag: "--database-url",
			fallback: "postgres://user:secret@localhost:5432/database",
		}),
	}),
});

const appConfig = await config.load(
	new URL("./config.json", import.meta.url),
	struct,
);

console.log(config.getUsage(struct, appConfig));
console.log();
console.log();
console.log("JSON Schema:");
console.log(JSON.stringify(config.getJSONSchema(struct)));
