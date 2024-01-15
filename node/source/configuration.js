import * as superstruct from "superstruct";
import fs from "node:fs";
import process from "node:process";
import util from "node:util";

import { Configuration } from "../../core/mod.js";

/** @typedef {import("../../core/mod.js").ConfigurationOptions} ConfigurationOptions */

// TODO: this implementation could be better
export class NodeConfiguration extends Configuration {
	/** @returns {ConfigurationOptions} */
	static getOptions() {
		const args = util.parseArgs({
			args: process.args,
			strict: false,
		});
		return {
			superstruct,
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

	constructor() {
		super(NodeConfiguration.getOptions());
	}
}
