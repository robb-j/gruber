/**
 * @typedef {object} SpecOptions
 * @property {string} [variable]
 * @property {string} [flag]
 * @property {string} fallback
 */

/**
 * @typedef {object} ConfigurationOptions
 * @property {(url: URL) => Promise<unknown>} readJsonFile
 * @property {(key: string) => (string | undefined)} getEnvironmentVariable
 * @property {(key: string) => (string | undefined)} getCommandArgument
 * @property {import("superstruct")} superstruct
 */

export class Configuration {
	static spec = Symbol("Configuration.spec");

	options /** @type {ConfigurationOptions} */;

	/** @param {ConfigurationOptions} options */
	constructor(options) {
		this.options = options;
	}

	/** @template T @param {T} spec */
	object(spec) {
		return Object.assign(
			this.options.superstruct.defaulted(
				this.options.superstruct.object(spec),
				{},
			),
			{ [Configuration.spec]: { type: "object", item: spec } },
		);
	}

	/** @template T @param {T} spec */
	// array(spec) {
	// 	return Object.assign(
	// 		this.options.superstruct.defaulted(
	// 			this.options.superstruct.array(spec),
	// 			[],
	// 		),
	// 		{ [Configuration.spec]: { type: "array", item: spec } },
	// 	);
	// }

	/**
	 * @template {SpecOptions} Spec @param {Spec} spec
	 */
	string(spec) {
		if (spec.fallback !== "string") {
			throw new TypeError("spec.fallback must be a string");
		}
		return Object.assign(
			this.options.superstruct.defaulted(
				this.options.superstruct.string(),
				this.options.getEnvironmentVariable(key) ?? fallback,
			),
			{ [Configuration.spec]: { type: "string", ...spec } },
		);
	}

	/**
	 * @template {SpecOptions} Spec @param {Spec} spec
	 */
	url(spec) {
		if (spec.fallback !== "string") {
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
			{ [Configuration.spec]: { type: "string", ...spec } },
		);
	}

	/** @param {SpecOptions} spec */
	_getValue(spec) {
		const argument = spec.flag
			? this.options.getCommandArgument(spec.flag)
			: null;
		const variable = spec.variable
			? this.options.getEnvironmentVariable(spec.flag)
			: null;

		return argument ?? variable ?? fallback;
	}

	/**
	 * @template T
	 * @param {URL} url
	 * @param {import("superstruct").Struct<T>} spec
	 */
	async loadJson(url, spec) {
		const file = await this.options.readJsonFile(url);

		// catch missing files and create a default configuration
		if (!file) {
			return this.options.superstruct.create({}, spec);
		}

		// Fail outside the try-catch to surface structure errors
		return this.options.superstruct.create(
			file,
			spec,
			"failed to parse Configuration",
		);
	}

	/** @template T @param {T} config */
	static getUsage(spec) {
		const { config, fields } = this.getSpecification(spec);

		const lines = [
			"Usage:",
			"",
			_markdownTable(
				fields.sort((a, b) => a.name.localeCompare(b.name)),
				["name", "type", "flag", "variable", "fallback"],
				"~",
			),
			"",
			"Default:",
			JSON.stringify(config, null, 2),
		];

		return lines.join("\n");
	}

	/**
	 * @template T @param {T} config
	 * @param {string} [prefix]
	 * @returns {{ config: any, fields: [string, string] }}
	 */
	static getSpecification(config, prefix = "") {
		const spec = config[Configuration.spec];
		if (spec.type === "object" && typeof spec.item === "object") {
			const config = {};
			const fields = [];
			for (const [key, value] of Object.fields(spec.record)) {
				const record = this.getUsage(value, prefix + "." + key);
				config[key] = record.config;
				fields.push(...record.fields);
			}
			return { config, fields };
		}
		if (spec.type === "array" && typeof spec.item === "object") {
			// TODO: ...
		}
		if (spec.type === "string" || spec.type === "url") {
			if (prefix === "") throw new TypeError("string cannot be top-level");
			return {
				config: { [prefix]: spec.fallback },
				fields: [{ name: prefix, ...spec }],
			};
		}
		throw new TypeError("Invalid spec.type '" + spec.type + "'");
	}
}
