import { formatMarkdownTable } from "./utilities.js";
import { Structure, StructError } from "./structures.js";

// NOTE: it would be nice to reverse the object/string/url methods around so they return the "spec" value, then the "struct" is stored under a string. This could mean the underlying architecture could change in the future. I'm not sure if that is possible with the structure nesting in play.

// NOTE: the schema generation will include whatever value is passed to the structure, in the context of configuration it will be whatever is configured and may be something secret

/**
 * @template [T=any]
 * @typedef {object} SpecOptions
 * @property {string} [variable]
 * @property {string} [flag]
 * @property {T} fallback
 */

/**
 * @template T
 * @typedef {object} ConfigurationResult
 * @property {'argument' | 'variable' | 'fallback'} source
 * @property {string|T} value
 */

/**
 * @typedef {object} ConfigurationDescription
 * @property {unknown} fallback
 * @property {Record<string,string>[]} fields
 */

/**
 * @typedef {object} Specification
 * @property {(name: string) => ConfigurationDescription} describe
 */

/**
 * @param {unknown} value
 * @returns {Specification | null}
 */
export function _getSpec(value) {
	return typeof value[Configuration.spec] === "object" &&
		typeof value[Configuration.spec].describe === "function"
		? value[Configuration.spec]
		: null;
}

//
// NOTE: describe() calls should return the actual value in "fallback"
//       and the string-value in fields
//

// TODO: needs its own tests
export class _ObjectSpec {
	/** @param {Record<string, Structure<unknown>>} options  */
	constructor(options) {
		this.options = options;
	}
	describe(name) {
		const fallback = {};
		const fields = [];
		for (const [key, struct] of Object.entries(this.options)) {
			const childName = (name ? name + "." : "") + key;
			const childSpec = _getSpec(struct)?.describe(childName);

			if (childSpec) {
				fallback[key] = childSpec.fallback;
				fields.push(...childSpec.fields);
			}
		}
		return { fallback, fields };
	}
}

// TODO: needs its own tests
export class _PrimativeSpec {
	/**
	 * @param {string} type
	 * @param {SpecOptions<any>} options
	 */
	constructor(type, options) {
		this.type = type;
		this.options = options;
	}
	describe(name) {
		return {
			fallback: this.options.fallback,
			fields: [
				{
					...this.options,
					name,
					type: this.type,
					fallback: this.options.fallback?.toString(),
				},
			],
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

const _booleans = {
	1: true,
	true: true,
	0: false,
	false: false,
};

/**
 * @typedef {object} ConfigurationOptions
 * @property {(url: URL|string) => Promise<string | null>} readTextFile
 * @property {(key: string) => (string | undefined)} getEnvironmentVariable
 * @property {(key: string) => (string | undefined)} getCommandArgument
 * @property {(value: any) => (string | Promise<string>)} stringify
 * @property {(value: string) => (any)} parse
 */

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
	 * @param {T} options
	 * @returns {Structure<{ [K in keyof T]: import("./structures.js").Infer<T[K]> }>}
	 */
	object(options) {
		if (typeof options !== "object" || options === null) {
			throw new TypeError("options must be a non-null object");
		}
		const struct = Structure.object(options);
		struct[Configuration.spec] = new _ObjectSpec(options);
		return struct;
	}

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
		struct[Configuration.spec] = new _PrimativeSpec("string", options);
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
		struct[Configuration.spec] = new _PrimativeSpec("number", options);
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
		struct[Configuration.spec] = new _PrimativeSpec("boolean", options);
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
			throw new TypeError("options.fallback must be a string or URL");
		}
		const struct = Structure.url(this._getValue(options).value);
		struct[Configuration.spec] = new _PrimativeSpec("url", {
			...options,
			fallback: new URL(options.fallback),
		});
		return struct;
	}

	/**
	 * @template T
	 * @param {SpecOptions<T>} options
	 * @returns {ConfigurationResult<T>}
	 */
	_getValue(options) {
		const argument = options.flag
			? this.options.getCommandArgument(options.flag)
			: null;
		if (argument) return { source: "argument", value: argument };

		const variable = options.variable
			? this.options.getEnvironmentVariable(options.variable)
			: null;
		if (variable) return { source: "variable", value: variable };

		return { source: "fallback", value: options.fallback };
	}

	/** @param {ConfigurationResult<number>} result */
	_parseFloat(result) {
		if (typeof result.value === "string") {
			const parsed = Number.parseFloat(result.value);
			if (Number.isNaN(parsed)) {
				throw TypeError(`Invalid number: ${result.value}`);
			}
			return parsed;
		}
		if (typeof result.value === "number") {
			return result.value;
		}
		throw new TypeError("Unknown result");
	}

	/** @param {ConfigurationResult<boolean>} result */
	_parseBoolean(result) {
		if (typeof result.value === "boolean") return result.value;

		if (typeof _booleans[result.value] === "boolean") {
			return _booleans[result.value];
		}
		if (result.source === "argument" && result.value === "") {
			return true;
		}
		throw new TypeError("Unknown result");
	}

	/**
	 * @template T
	 * @param {URL|string} url
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
			const value = await this.options.parse(file);
			delete value.$schema;
			return spec.process(value);
		} catch (error) {
			console.error("Configuration failed to parse");
			if (error instanceof StructError) {
				error.message = error.toFriendlyString();
			}
			throw error;
		}
	}

	/**
	 * @param {unknown} struct
	 * @param {unknown} [currentValue]
	 */
	getUsage(struct, currentValue) {
		const { fallback, fields } = this.describe(struct);

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

		if (currentValue) {
			lines.push("", "", "Current:", JSON.stringify(currentValue, null, 2));
		}

		return lines.join("\n");
	}

	/**
	 * @param {unknown} struct
	 * @param {string} [prefix]
	 * @returns {{ config: any, fields: [string, string] }}
	 */
	describe(value, prefix = "") {
		const spec = _getSpec(value);
		if (!spec) throw new TypeError("Invalid [Configuration.spec]");
		return spec.describe(prefix);
	}

	/** * @param {Structure<any>} struct */
	getJSONSchema(struct) {
		return struct.getSchema();
	}
}
