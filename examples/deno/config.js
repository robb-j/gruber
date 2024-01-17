// Adapted from the README.md

// Usage:
// DENO_ENV=staging deno run -A examples/deno/config.js --database-url=mysql://database

import * as superstruct from "npm:superstruct@^1.0.3";
import { getDenoConfiguration } from "../../deno/mod.ts";
// import { getDenoConfiguration } from "../../bundle/deno/mod.ts";

function getConfigSpec() {
	return config.object({
		env: config.string({ variable: "DENO_ENV", fallback: "development" }),

		selfUrl: config.url({
			variable: "SELF_URL",
			fallback: "http://localhost:8000",
		}),

		// Short hands?
		meta: config.object({
			name: config.string({ fallback: meta.name, flag: "--app-name" }),
			version: config.string({ fallback: meta.version }),
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

const meta = { name: "gruber-app", version: "1.2.3" };

const config = getDenoConfiguration({ superstruct });
const appConfig = await config.load(
	new URL("./config.json", import.meta.url),
	getConfigSpec(),
);

console.log(config.getUsage(getConfigSpec()));
console.log();
console.log("Loaded:");
console.log(JSON.stringify(appConfig, null, 2));
