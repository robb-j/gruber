import { formatMarkdownTable } from "./utilities.js";
import { Structure, StructError } from "./structures.js";

// NOTE: it would be nice to reverse the object/string/url methods around so they return the "spec" value, then the "struct" is stored under a string. This could mean the underlying architecture could change in the future. I'm not sure if that is possible with the structure nesting in play.

// NOTE: the schema generation will include whatever value is passed to the structure, in the context of configuration it will be whatever is configured and may be something secret

// NAMING: this has got a bit confusing there is:
// - `Configuration` the class with `config` as an instance of it
// - config.object et all return a `spec` which is a Structure
// - spec[Configuration.spec] returns a `spec`
// - spec[Configuration.spec] are {X}Configuration instances
//
// hmmm
//
// changes:
// - config.object (et all) return a `struct`
// - struct[Config.spec] return a spec
// - struct[Config.spec] are {X}Specification instances

/**
 * @template [T=any]
 * @typedef {object} SpecOptions
 * @property {string} [variable]
 * @property {string} [flag]
 * @property {T} fallback
 */

/**
 * @template T
 * @typedef {object} SpecResult
 * @property {'argument' | 'variable' | 'fallback'} source
 * @property {string|T} value
 */

/**
 * @typedef {object} DescribeResult
 * @property {unknown} fallback
 * @property {Record<string,string>[]} fields
 */

/**
 * @typedef {object} ConfigurationType
 * @property {string} type
 * @property {unknown} options
 * @property {(name: string, describe: Function) => DescribeResult} describe
 */

/**
 * @typedef ConfigSpec
 * @property {string} type
 * @property {any} options
 * @property {(name: string) => DescribeResult} describe
 */

/**
 * @param {string} name
 * @param {unknown} value
 * @returns {ConfigSpec}
 */
function getSpec(name, value) {
	if (
		typeof value[Configuration.spec] !== "object" ||
		typeof value[Configuration.spec].type !== "string" ||
		typeof value[Configuration.spec].options !== "object" ||
		typeof value[Configuration.spec].describe !== "function"
	) {
		throw new TypeError(`Invalid [Configuration.spec] for '${name}'`);
	}
	return value[Configuration.spec];
}

class _ObjectSpecification {
	/** @param {Record<string, SpecOptions>} options  */
	constructor(options) {
		this.type = "object";
		this.options = options;
	}
	describe(name) {
		const fallback = {};
		const fields = [];
		for (const [key, childOptions] of Object.entries(this.options)) {
			const childName = (name ? name + "." : "") + key;
			const childSpec = getSpec(childName, childOptions).describe(childName);

			fallback[key] = childSpec.fallback;
			fields.push(...childSpec.fields);
		}
		return { fallback, fields };
	}
}

class _StringSpecification {
	/** @param {SpecOptions<string>} */
	constructor(options) {
		this.type = "string";
		this.options = options;
	}
	describe(name) {
		return {
			fallback: this.options.fallback,
			fields: [{ name, type: "string", ...this.options }],
		};
	}
}

class _NumberSpecification {
	/** @param {SpecOptions<string>} options */
	constructor(options) {
		this.type = "number";
		this.options = options;
	}
	describe(name) {
		return {
			fallback: this.options.fallback,
			fields: [{ name, type: "number", ...this.options }],
		};
	}
}

class _BooleanSpecification {
	/** @param {SpecOptions<boolean>} options */
	constructor(options) {
		this.type = "boolean";
		this.options = options;
	}
	describe(name) {
		return {
			fallback: this.options.fallback,
			fields: [{ name, type: "boolean", ...this.options }],
		};
	}
}
class _URLSpecification {
	/** @param {SpecOptions<string|URL>} options */
	constructor(options) {
		this.type = "url";
		this.options = options;
	}
	describe(name) {
		return {
			fallback: new URL(this.options.fallback),
			fields: [{ name, type: "url", ...this.options }],
		};
	}
}

const _requiredOptions = [
	"readTextFile",
	"getEnvironmentVariable",
	"getCommandArgument",
	"stringify",
	"parse",
];

/**
 * @typedef {object} ConfigurationOptions
 * @property {(url: URL) => Promise<string | null>} readTextFile
 * @property {(key: string) => (string | undefined)} getEnvironmentVariable
 * @property {(key: string) => (string | undefined)} getCommandArgument
 * @property {(value: any) => (string | Promise<string>)} stringify
 * @property {(value: string) => (any)} parse
 */

export class Configuration {
	static spec = Symbol("Configuration.spec");
	static booleanStrings = {
		1: true,
		true: true,
		0: false,
		false: false,
	};

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
	 * @param {T} options
	 * @returns {Structure<{ [K in keyof T]: import("./structures.js").Infer<T[K]> }>}
	 */
	object(options) {
		if (typeof options !== "object" || options === null) {
			throw new TypeError("options must be a non-null object");
		}
		const struct = Structure.object(options);
		struct[Configuration.spec] = new _ObjectSpecification(options);
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
	 * @param {SpecOptions<string>} options
	 * @returns {Structure<string>}
	 */
	string(options = {}) {
		if (typeof options.fallback !== "string") {
			throw new TypeError(
				"options.fallback must be a string: " + options.fallback,
			);
		}

		const struct = Structure.string(this._getValue(options).value);
		struct[Configuration.spec] = new _StringSpecification(options);
		return struct;
	}

	/**
	 * @param {SpecOptions<number>} options
	 * @returns {Structure<number>}
	 */
	number(options) {
		if (typeof options.fallback !== "number") {
			throw new TypeError("options.fallback must be a number");
		}

		const fallback = this._parseFloat(this._getValue(options));
		const struct = Structure.number(fallback);
		// struct[Configuration.spec] = { type: "number", value: options };
		struct[Configuration.spec] = new _NumberSpecification(options);
		return struct;
	}

	/**
	 * @param {SpecOptions<boolean>} options
	 * @returns {Structure<number>}
	 */
	boolean(options) {
		if (typeof options.fallback !== "boolean") {
			throw new TypeError("options.fallback must be a boolean");
		}

		const fallback = this._parseBoolean(this._getValue(options));
		const struct = Structure.boolean(fallback);
		struct[Configuration.spec] = new _BooleanSpecification(options);
		return struct;
	}

	/**
	 * @param {SpecOptions<string|URL>} options
	 * @returns {Structure<URL>}
	 */
	url(options) {
		if (
			typeof options.fallback !== "string" &&
			!(options.fallback instanceof URL)
		) {
			throw new TypeError("options.fallback must be a string");
		}
		const struct = Structure.url(this._getValue(options).value);
		struct[Configuration.spec] = new _URLSpecification(options);
		return struct;
	}

	/**
	 * @template T
	 * @param {SpecOptions<T>} spec
	 * @returns {SpecResult<T>}
	 */
	_getValue(spec) {
		const argument = spec.flag
			? this.options.getCommandArgument(spec.flag)
			: null;
		if (argument) return { source: "argument", value: argument };

		const variable = spec.variable
			? this.options.getEnvironmentVariable(spec.variable)
			: null;
		if (variable) return { source: "variable", value: variable };

		return { source: "fallback", value: spec.fallback };
	}

	/** @param {SpecResult<number>} result */
	_parseFloat(result) {
		if (typeof result.value === "string") {
			return Number.parseFloat(result.value);
		}
		if (typeof result.value === "number") {
			return result.value;
		}
		throw new TypeError("Unknown result");
	}

	/** @param {SpecResult<boolean>} result */
	_parseBoolean(result) {
		if (typeof result.value === "boolean") return result.value;

		if (typeof Configuration.booleanStrings[result.value] === "boolean") {
			return Configuration.booleanStrings[result.value];
		}
		if (result.source === "argument" && result.value === "") {
			return true;
		}
		throw new TypeError("Unknown result");
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

	/** @param {unknown} value */
	getUsage(value) {
		const { fallback, fields } = this.describe(value);

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
	 * @param {unknown} struct
	 * @param {string} [prefix]
	 * @returns {{ config: any, fields: [string, string] }}
	 */
	describe(value, prefix = "") {
		return getSpec(prefix || ".", value).describe(prefix);
	}

	/** * @param {Structure<any>} struct */
	getJSONSchema(struct) {
		return struct.getSchema();
	}
}
