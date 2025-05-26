import { formatMarkdownTable, PromiseList } from "./utilities.ts";
import { Infer, StructContext, StructError, Structure } from "./structures.ts";

// NOTE: it would be nice to reverse the object/string/url methods around so they return the "spec" value, then the "struct" is stored under a string. This could mean the underlying architecture could change in the future. I'm not sure if that is possible with the structure nesting in play.

// NOTE: the schema generation will include whatever value is passed to the structure, in the context of configuration it will be whatever is configured and may be something secret

export interface SpecOptions<T = any> {
	variable?: string;
	flag?: string;
	fallback: T;
}

export interface ConfigurationResult<T> {
	source: "argument" | "variable" | "fallback";
	value: string | T;
}

export interface ConfigurationDescription {
	fallback: unknown;
	fields: Record<string, string>[];
}

export interface Specification {
	describe(name: string): ConfigurationDescription;
}

export function _getSpec(value: any): Specification | null {
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
export class _ObjectSpec implements Specification {
	options: Record<string, Structure<unknown>>;

	constructor(options: Record<string, Structure<unknown>>) {
		this.options = options;
	}
	describe(name: string): ConfigurationDescription {
		const fallback: Record<string, unknown> = {};
		const fields: Record<string, string>[] = [];
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
export class _ArraySpec implements Specification {
	/** @param {Structure<unknown>} options  */
	options: Structure<unknown>;

	constructor(options: Structure<unknown>) {
		this.options = options;
	}

	describe(name: string): ConfigurationDescription {
		const childName = !name ? "[]" : name + "[]";
		const childSpec = _getSpec(this.options)?.describe(childName);
		if (!childSpec) return { fallback: [], fields: [] };

		return {
			fallback: [],
			fields: childSpec.fields,
		};
	}
}

// TODO: needs its own tests
export class _PrimativeSpec {
	type: string;
	options: SpecOptions<any>;

	constructor(type: string, options: SpecOptions<any>) {
		this.type = type;
		this.options = options;
	}

	describe(name: string): ConfigurationDescription {
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

const _booleans: Record<string, boolean | undefined> = {
	1: true,
	true: true,
	0: false,
	false: false,
};

export interface ConfigurationOptions {
	readTextFile(url: URL | string): Promise<string | null>;
	getEnvironmentVariable(key: string): string | undefined;
	getCommandArgument(key: string): string | undefined;
	stringify(value: any): string | Promise<string>;
	parse(value: string): any;
	getWorkingDirectory(): URL;
}

export class Configuration {
	static readonly spec = Symbol("Configuration.spec");

	options: ConfigurationOptions;

	constructor(options: ConfigurationOptions) {
		this.options = options;
	}

	object<T extends Record<string, Structure<unknown>>>(
		options: T,
	): Structure<{ [K in keyof T]: Infer<T[K]> }> {
		if (typeof options !== "object" || options === null) {
			throw new TypeError("options must be a non-null object");
		}
		for (const key in options) {
			if (!(options[key] instanceof Structure)) {
				throw new TypeError(`options[${key}] is not a Structure`);
			}
		}
		const struct = Structure.object(options);
		Object.defineProperty(struct, Configuration.spec, {
			value: new _ObjectSpec(options),
		});
		return struct;
	}

	array<T extends Structure<unknown>>(options: T): Structure<Infer<T>[]> {
		if (!(options instanceof Structure)) {
			throw new TypeError("options is not a Structure");
		}
		const struct = Structure.array(options);
		Object.defineProperty(struct, Configuration.spec, {
			value: new _ArraySpec(options),
		});
		return struct;
	}

	string(options: SpecOptions<string>): Structure<string> {
		if (typeof options?.fallback !== "string") {
			throw new TypeError(
				"options.fallback must be a string: " + options.fallback,
			);
		}
		const struct = Structure.string(this._getValue(options).value);
		Object.defineProperty(struct, Configuration.spec, {
			value: new _PrimativeSpec("string", options),
		});
		return struct;
	}

	number(options: SpecOptions<number>): Structure<number> {
		if (typeof options?.fallback !== "number") {
			throw new TypeError("options.fallback must be a number");
		}
		const fallback = this._parseFloat(this._getValue(options));
		const struct = Structure.number(fallback);
		Object.defineProperty(struct, Configuration.spec, {
			value: new _PrimativeSpec("number", options),
		});
		return struct;
	}

	boolean(options: SpecOptions<boolean>): Structure<boolean> {
		if (typeof options?.fallback !== "boolean") {
			throw new TypeError("options.fallback must be a boolean");
		}
		const fallback = this._parseBoolean(this._getValue(options));
		const struct = Structure.boolean(fallback);
		Object.defineProperty(struct, Configuration.spec, {
			value: new _PrimativeSpec("boolean", options),
		});
		return struct;
	}

	url(options: SpecOptions<string | URL>): Structure<URL> {
		if (
			typeof options.fallback !== "string" &&
			!(options.fallback instanceof URL)
		) {
			throw new TypeError("options.fallback must be a string or URL");
		}
		const struct = Structure.url(this._getValue(options).value);
		Object.defineProperty(struct, Configuration.spec, {
			value: new _PrimativeSpec("url", {
				...options,
				fallback: new URL(options.fallback),
			}),
		});

		return struct;
	}

	external<T extends Record<string, unknown> | Array<unknown>>(
		path: string | URL,
		struct: Structure<T>,
	) {
		return new Structure(struct.schema, (value, context) => {
			if (context.type !== "async") {
				throw new Error("config.external must be used async");
			}

			// Create a dummy value to return for now
			let internal: any = struct.schema.type === "array" ? [] : {};

			// Register a promise to load the actual value
			context.promise.push(async () => {
				// Try loading the external value
				let loaded = await this._loadValue(path, struct, context);

				// If not found, try the inline value
				if (loaded === null) {
					loaded = struct.process(value, context);
				}

				// Apply the value depending if its an array or not
				// being carful to modifiy the existing reference
				if (struct.schema.type === "array") {
					internal.push(...(loaded as any[]));
				} else {
					Object.assign(internal, loaded);
				}
			});

			return internal;
		});
	}

	async _loadValue<T>(
		path: string | URL,
		structure: Structure<T>,
		context: StructContext,
	): Promise<T | null> {
		const text = await this.options.readTextFile(path);

		// Catch missing files and create a default configuration
		// if (!text) return structure.process(defaultValue, context);
		if (!text) return null;

		// Parse the text file
		const value = this.options.parse(text);

		// Remove the JSON schema field if it is set
		delete value.$schema;

		// Process the contents
		return structure.process(value, context);
	}

	_getValue<T>(options: SpecOptions<T>): ConfigurationResult<T> {
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

	_parseFloat(result: ConfigurationResult<number>): number {
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
		throw new TypeError("Unknown float result");
	}

	_parseBoolean(result: ConfigurationResult<boolean>): boolean {
		if (typeof result.value === "boolean") return result.value;

		if (typeof _booleans[result.value] === "boolean") {
			return _booleans[result.value]!;
		}
		if (result.source === "argument" && result.value === "") {
			return true;
		}
		throw new TypeError("Unknown boolean result");
	}

	async load<T>(url: URL | string, spec: Structure<T>): Promise<T> {
		const context: StructContext = {
			type: "async",
			path: [],
			promise: new PromiseList(),
		};

		// Fail outside the try-catch to surface structure errors
		try {
			let obj: T | null = await this._loadValue(url, spec, context);
			if (!obj) obj = spec.process({}, context);

			await context.promise.all();

			return obj;
		} catch (error) {
			if (error instanceof StructError) {
				console.error(error.toFriendlyString());
			} else {
				console.error("Configuration failed to parse");
			}
			console.error();
			throw error;
		}
	}

	getUsage(struct: unknown, currentValue?: unknown) {
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

	describe(value: unknown, prefix = ""): ConfigurationDescription {
		const spec = _getSpec(value);
		// if (!spec) throw new TypeError("Invalid [Configuration.spec]");
		if (!spec) return { fallback: undefined, fields: [] };
		return spec.describe(prefix);
	}

	getJSONSchema(struct: Structure<any>) {
		return struct.getSchema();
	}
}
