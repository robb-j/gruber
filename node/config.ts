import fs from "node:fs";
import process from "node:process";
import util from "node:util";

import { Configuration, type ConfigurationOptions } from "../config/mod.ts";

/**
 * Generate standardish options to create a Configuration from the Node.js environment that reads JSON files.
 *
 * - It uses parseArgs from `node:util` to parse CLI arguments
 * - It uses promises.readFile from `node:fs` to read text files
 * - It reads environment variables from `node:process`
 * - It parses and stringifies configuration using `JSON`
 *
 * ```js
 * const options = getConfigurationOptions()
 * ```
 */
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
 * Create a standardish Node.js Configuration.
 * It creates a new Configuration object using {@link getConfigurationOptions}.
 *
 * ```js
 * const config = getConfiguration()
 * ```
 */
export function getConfiguration() {
	return new Configuration(getConfigurationOptions());
}

/** @deprecated use {@link getConfigurationOptions} */
export const getNodeConfigOptions = getConfigurationOptions;

/** @deprecated use {@link getConfiguration} */
export const getNodeConfiguration = getConfiguration;
