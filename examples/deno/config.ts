// Adapted from the README.md

// Usage:
// DENO_ENV=staging deno run -A examples/deno/config.ts --database-url=mysql://database

import { getConfiguration, Structure } from "../../bundle/deno/mod.ts";

const config = getConfiguration();
const meta = { name: "deno-gruber-app", version: "1.2.3" };

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

	auth: config.external(
		new URL("../auth.json", import.meta.url),
		config.object({
			users: Structure.array(Structure.string()),
		}),
	),

	apiKeys: config.external(
		new URL("../keys.json", import.meta.url),
		Structure.array(Structure.string()),
	),
});

const appConfig = await config.load(
	new URL("../config.json", import.meta.url),
	struct,
);

console.log(config.getUsage(struct, appConfig));
console.log();
console.log();
console.log("JSON Schema:");
console.log(JSON.stringify(config.getJSONSchema(struct)));
