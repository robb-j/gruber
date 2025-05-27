// Adapted from the README.md

// Usage:
// NODE_ENV=staging node examples/node/config.js --database-url=mysql://database

import { getConfiguration, Structure } from "gruber/configuration.js";

const config = getConfiguration();
const pkg = { name: "node-gruber-app", version: "1.2.3" };

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
