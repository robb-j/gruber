import fs from "node:fs";
import process from "node:process";
import util from "node:util";

import { Configuration, ConfigurationOptions } from "../config/mod.ts";

export function getConfigurationOptions(): ConfigurationOptions {
	const args = util.parseArgs({
		args: process.argv,
		strict: false,
	});
	return {
		async readTextFile(url) {
			try {
				return await fs.promises.readFile(url, "utf-8");
			} catch (error) {
				return null;
			}
		},
		getEnvironmentVariable(key) {
			return process.env[key];
		},
		getCommandArgument(key) {
			return args.values[key.replace(/^-+/, "")] as string;
		},
		stringify(config) {
			return JSON.stringify(config, null, 2);
		},
		parse(data) {
			return JSON.parse(data);
		},
	};
}

/**
 * This is a syntax sugar for `new Configuration(getConfigurationOptions(options))`
 */
export function getConfiguration() {
	return new Configuration(getConfigurationOptions());
}

/** @deprecated use `getConfigurationOptions` */
export const getNodeConfigOptions = getConfigurationOptions;

/** @deprecated use `getNodeConfiguration` */
export const getNodeConfiguration = getConfiguration;
