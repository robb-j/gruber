import { formatMarkdownTable } from "./utilities.js";
import { Structure, StructError } from "./structures.js";

// NOTE: it would be nice to reverse the object/string/url methods around so they return the "spec" value, then the "struct" is stored under a string. This could mean the underlying architecture could change in the future. I'm not sure if that is possible with the structure nesting in play.

// NOTE: the schema generation will include whatever value is passed to the structure, in the context of configuration it will be whatever is configured and may be something secret

/**
 * @typedef {object} SpecOptions
 * @property {string} [variable]
 * @property {string} [flag]
 * @property {string} fallback
 */

/**
 * @typedef {object} ConfigurationOptions
 * @property {(url: URL) => Promise<string | null>} readTextFile
 * @property {(key: string) => (string | undefined)} getEnvironmentVariable
 * @property {(key: string) => (string | undefined)} getCommandArgument
 * @property {(value: any) => (string | Promise<string>)} stringify
 * @property {(value: string) => (any)} parse
 */

const _requiredOptions = [
	"readTextFile",
	"getEnvironmentVariable",
	"getCommandArgument",
	"stringify",
	"parse",
];

export class Configuration {
	static spec = Symbol("Configuration.spec");

	/** @type {ConfigurationOptions} */ options;

	/** @param {ConfigurationOptions} options */
	constructor(options) {
		for (const key of _requiredOptions) {
			if (!options[key]) throw new TypeError(`options.${key} is required`);
		}
		this.options = options;
	}

	/**
	 * @template {Record<string, Structure<any>>} T
	 * @param {T} spec
	 * @returns {Structure<{ [K in keyof T]: import("./structures.js").Infer<T[K]> }>}
	 */
	object(spec) {
		const struct = Structure.object(spec);
		struct[Configuration.spec] = { type: "object", value: spec };
		return struct;
	}

	// TODO: Not sure if this should be exposed
	// /**
	//  * @template {Structure<any>} T
	//  * @param {T} spec
	//  * @returns {Structure<Array<import("./structures.js").Infer<T>>>}
	//  */
	// array(spec) {
	// 	const struct = Structure.array(spec);
	// 	struct[Configuration.spec] = { type: "array", value: spec };
	// 	return struct;
	// }

	/**
	 * @template {SpecOptions} Spec @param {Spec} spec
	 * @returns {Structure<string>}
	 */
	string(spec = {}) {
		if (typeof spec.fallback !== "string") {
			throw new TypeError("spec.fallback must be a string: " + spec.fallback);
		}
		const struct = Structure.string(this._getValue(spec));
		struct[Configuration.spec] = { type: "string", value: spec };
		return struct;
	}

	/**
	 * @template {SpecOptions} Spec @param {Spec} spec
	 * @returns {Structure<URL>}
	 */
	url(spec) {
		if (typeof spec.fallback !== "string") {
			throw new TypeError("spec.fallback must be a string");
		}
		const struct = Structure.url(this._getValue(spec));
		struct[Configuration.spec] = { type: "url", value: spec };
		return struct;
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
	 * @param {Structure<T>} spec
	 * @returns {Promise<T>}
	 */
	async load(url, spec) {
		const file = await this.options.readTextFile(url);

		// Catch missing files and create a default configuration
		if (!file) {
			return spec.process({});
		}

		// Fail outside the try-catch to surface structure errors
		try {
			return spec.process(await this.options.parse(file));
		} catch (error) {
			console.error("Configuration failed to parse");
			if (error instanceof StructError) {
				error.message = error.toFriendlyString();
			}
			throw error;
		}
	}

	/** @template T @param {T} config */
	getUsage(spec) {
		const { fallback, fields } = this.describeSpecification(spec);

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
			this.options.stringify(fallback),
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
				fields: [{ name: prefix, type, ...value }],
			};
		}
		if (type === "url") {
			return {
				fallback: new URL(value.fallback),
				fields: [{ name: prefix, type, ...value }],
			};
		}
		throw new TypeError("Invalid [Configuration.spec].type '" + type + "'");
	}

	/** @param {Structure<any>} spec */
	getJSONSchema(spec) {
		return spec.getSchema();
	}
}
