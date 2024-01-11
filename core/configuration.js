import { formatMarkdownTable } from "./utilities.js";

/**
 * @typedef {object} SpecOptions
 * @property {string} [variable]
 * @property {string} [flag]
 * @property {string} fallback
 */

/**
 * @typedef {object} ConfigurationOptions
 * @property {import("superstruct")} superstruct
 * @property {(url: URL) => Promise<string | null>} readTextFile
 * @property {(key: string) => (string | undefined)} getEnvironmentVariable
 * @property {(key: string) => (string | undefined)} getCommandArgument
 * @property {(value: any) => (string | Promise<string>)} stringify
 * @property {(value: string) => (any)} parse
 */

const requiredOptions = [
	"superstruct",
	"readTextFile",
	"getEnvironmentVariable",
	"getCommandArgument",
	"stringify",
	"parse",
];

export class Configuration {
	static spec = Symbol("Configuration.spec");

	options /** @type {ConfigurationOptions} */;

	/** @param {ConfigurationOptions} options */
	constructor(options) {
		for (const key of requiredOptions) {
			if (!options[key]) throw new TypeError(`options.${key} is required`);
		}
		this.options = options;
	}

	/** @template T @param {T} spec */
	object(spec) {
		return Object.assign(
			this.options.superstruct.defaulted(
				this.options.superstruct.object(spec),
				{},
			),
			{ [Configuration.spec]: { type: "object", value: spec } },
		);
	}

	/** @template T @param {T} spec */
	// array(spec) {
	// 	return Object.assign(
	// 		this.options.superstruct.defaulted(
	// 			this.options.superstruct.array(spec),
	// 			[],
	// 		),
	// 		{ [Configuration.spec]: { type: "array", value: spec } },
	// 	);
	// }

	/**
	 * @template {SpecOptions} Spec @param {Spec} spec
	 */
	string(spec = {}) {
		if (typeof spec.fallback !== "string") {
			throw new TypeError("spec.fallback must be a string: " + spec.fallback);
		}
		return Object.assign(
			this.options.superstruct.defaulted(
				this.options.superstruct.string(),
				this._getValue(spec),
			),
			{ [Configuration.spec]: { type: "string", value: spec } },
		);
	}

	/**
	 * @template {SpecOptions} Spec @param {Spec} spec
	 */
	url(spec) {
		if (typeof spec.fallback !== "string") {
			throw new TypeError("spec.fallback must be a string");
		}
		return Object.assign(
			this.options.superstruct.defaulted(
				this.options.superstruct.coerce(
					this.options.superstruct.instance(URL),
					this.options.superstruct.string(),
					(value) => new URL(value),
				),
				this._getValue(spec),
			),
			{ [Configuration.spec]: { type: "url", value: spec } },
		);
	}

	/** @param {SpecOptions} spec */
	_getValue(spec) {
		const argument = spec.flag
			? this.options.getCommandArgument(spec.flag)
			: null;

		const variable = spec.variable
			? this.options.getEnvironmentVariable(spec.variable)
			: null;

		return argument ?? variable ?? spec.fallback;
	}

	/**
	 * @template T
	 * @param {URL} url
	 * @param {import("superstruct").Struct<T>} spec
	 */
	async load(url, spec) {
		const file = await this.options.readTextFile(url);

		// Catch missing files and create a default configuration
		if (!file) {
			return this.options.superstruct.create({}, spec);
		}

		// Fail outside the try-catch to surface structure errors
		return this.options.superstruct.create(
			await this.options.parse(file),
			spec,
			"Configuration failed to parse",
		);
	}

	/** @template T @param {T} config */
	getUsage(spec) {
		const { config, fields } = this.describeSpecification(spec);

		const lines = [
			"Usage:",
			"",
			formatMarkdownTable(
				fields.sort((a, b) => a.name.localeCompare(b.name)),
				["name", "type", "flag", "variable", "fallback"],
				"~",
			),
			"",
			"",
			"Default:",
			this.options.stringify(config),
		];

		return lines.join("\n");
	}

	/**
	 * @template T @param {T} config
	 * @param {string} [prefix]
	 * @returns {{ config: any, fields: [string, string] }}
	 */
	describeSpecification(spec, prefix = "") {
		if (!spec[Configuration.spec]) {
			throw new TypeError("Invalid [Configuration.spec]");
		}
		const { type, value } = spec[Configuration.spec];

		if (type === "object") {
			const fallback = {};
			const fields = [];
			for (const [key, value2] of Object.entries(value)) {
				const child = this.describeSpecification(
					value2,
					(prefix ? prefix + "." : "") + key,
				);
				fallback[key] = child.fallback;
				fields.push(...child.fields);
			}
			return { fallback, fields };
		}
		if (type === "string") {
			return {
				fallback: value.fallback,
				fields: [{ name: prefix, ...value }],
			};
		}
		if (type === "url") {
			return {
				fallback: new URL(value.fallback),
				fields: [{ name: prefix, ...value }],
			};
		}
		throw new TypeError("Invalid [Configuration.spec].type '" + type + "'");
	}
}
