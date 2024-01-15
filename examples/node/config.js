// Adapted from the README.md

// Usage:
// NODE_ENV=staging node examples/node/config.js --database-url=mysql://database

import fs from "node:fs";
import { NodeConfiguration } from "gruber/configuration.js";

function getConfigSpec() {
	return config.object({
		env: config.string({ variable: "NODE_ENV", fallback: "development" }),

		selfUrl: config.url({
			variable: "SELF_URL",
			fallback: "http://localhost:3000",
		}),

		// Short hands?
		meta: config.object({
			name: config.string({ fallback: pkg.name, flag: "--app-name" }),
			version: config.string({ fallback: pkg.version }),
		}),

		database: config.object({
			url: config.url({
				flag: "--database-url",
				variable: "DATABASE_URL",
				fallback: "postgres://user:secret@localhost:5432/database",
			}),
		}),
	});
}

const pkg = { name: "gruber-app", version: "1.2.3" };

const config = new NodeConfiguration(fs, process);
const appConfig = await config.load(
	new URL("./config.json", import.meta.url),
	getConfigSpec(),
);

console.log(config.getUsage(getConfigSpec()));
console.log();
console.log("Loaded:");
console.log(JSON.stringify(appConfig, null, 2));
