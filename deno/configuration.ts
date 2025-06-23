import { Configuration, ConfigurationOptions } from "../config/mod.ts";
import { parseArgs } from "./deps.ts";

export * from "../config/mod.ts";

// deno-lint-ignore no-empty-interface
export interface DenoConfigurationOptions {}

export function getConfigurationOptions(
	_options: DenoConfigurationOptions = {},
): ConfigurationOptions {
	const args = parseArgs(Deno.args);
	return {
		async readTextFile(url: URL | string) {
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
export function getConfiguration(options: DenoConfigurationOptions = {}) {
	return new Configuration(getConfigurationOptions(options));
}

/** @deprecated use {@link getConfigurationOptions} */
export const getDenoConfigOptions = getConfigurationOptions;

/** @deprecated use {@link getConfiguration} */
export const getDenoConfiguration = getConfiguration;
