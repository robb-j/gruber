import fs from "node:fs";
import process from "node:process";
import util from "node:util";

import { Configuration } from "../core/configuration.js";

export { Configuration };

/**
	@typedef {object} NodeConfigurationOptions
*/

/**
 * @param {NodeConfigurationOptions} options
 * @returns {import("./core.js").ConfigurationOptions}
 */
export function getNodeConfigOptions(_options = {}) {
	const args = util.parseArgs({
		args: process.args,
		strict: false,
	});
	return {
		async readTextFile(url) {
			try {
				return await fs.promises.readFile(url);
			} catch (error) {
				return null;
			}
		},
		getEnvironmentVariable(key) {
			return process.env[key];
		},
		getCommandArgument(key) {
			return args.values[key.replace(/^-+/, "")];
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
 * This is a syntax sugar for `new Configuration(getNodeConfigOptions(options))`
 * @param {NodeConfigurationOptions} options
 */
export function getNodeConfiguration(options = {}) {
	return new Configuration(getNodeConfigOptions(options));
}
