import { getNodeConfiguration } from "../node/mod.js";

const config = getNodeConfiguration();

const spec = config.object({
	env: config.string({
		variable: "NODE_ENV",
		flag: "--env",
		fallback: "development",
	}),

	self: config.url({
		variable: "SELF_URL",
		fallback: "http://localhost:3000",
	}),

	database: config.object({
		url: config.url({
			variable: "DATABASE_URL",
			fallback: "postgres://user:secret@localhost:4567/database",
		}),
	}),

	cache: config.object({
		enabled: config.boolean({
			variable: "ENABLE_CACHE",
			flag: "--cache",
			fallback: false,
		}),
		version: config.number({
			flag: "--cache-version",
			fallback: 7,
		}),
	}),
});

const json = (input) => JSON.stringify(input, null, 2);

const appConfig = await config.load(
	new URL("./config.json", import.meta.url),
	spec,
);

console.log(config.getUsage(spec));
console.log();
console.log();
console.log("Current:");
console.log(json(appConfig));
console.log();
console.log();
console.log("JSON Schema:");
console.log(json(config.getJSONSchema(spec)));
