import { Configuration, ConfigurationOptions } from "../core/configuration.ts";
import { parseArgs, toFileUrl } from "./deps.ts";

export { Configuration };

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
		getWorkingDirectory() {
			return toFileUrl(Deno.cwd());
		},
	};
}

/** This is a syntax sugar for `new Configuration(getDenoConfigOptions(options))` */
export function getConfiguration(options: DenoConfigurationOptions = {}) {
	return new Configuration(getConfigurationOptions(options));
}

/** @deprecated use `getConfigurationOptions` */
export const getDenoConfigOptions = getConfigurationOptions;

/** @deprecated use `getConfiguration` */
export const getDenoConfiguration = getConfiguration;
