import { Configuration, ConfigurationOptions } from "../core/configuration.js";
import { parseArgs } from "./deps.ts";

export { Configuration };

// deno-lint-ignore no-empty-interface
export interface DenoConfigurationOptions {}

// TODO: this implementation could be better
// - pass in arguments / expose which ones were used or not
//   - so you can work out if invalid options were passed
// - argument checking logic could be better / needs testing
export function getDenoConfigOptions(
	_options: DenoConfigurationOptions = {},
): ConfigurationOptions {
	const args = parseArgs(Deno.args);
	return {
		async readTextFile(url: URL) {
			try {
				return await Deno.readTextFile(url);
			} catch (error) {
				if (error instanceof Deno.errors.NotFound) return null;
				else throw error;
			}
		},
		getEnvironmentVariable(key) {
			return Deno.env.get(key);
		},
		getCommandArgument(key) {
			return args[key.replace(/^-+/, "")];
		},
		stringify(config) {
			return JSON.stringify(config, null, 2);
		},
		parse(data) {
			return JSON.parse(data);
		},
	};
}

/** This is a syntax sugar for `new Configuration(getDenoConfigOptions(options))` */
export function getDenoConfiguration(options: DenoConfigurationOptions = {}) {
	return new Configuration(getDenoConfigOptions(options));
}
