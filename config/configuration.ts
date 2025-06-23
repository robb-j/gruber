import { Structure, Infer } from "./structure.ts";
import { formatMarkdownTable, PromiseList } from "../core/mod.ts";
import {
	arraySpec,
	ConfigurationDescription,
	getSpecification,
	objectSpec,
	PrimativeOptions,
	primativeSpec,
} from "./specifications.ts";
import {
	_parseBoolean,
	_parseFloat,
	_parsePrimative,
	_parseURL,
	ConfigurationResult,
} from "./parsers.ts";
import { StructContext } from "./struct-context.ts";

export interface ConfigurationOptions {
	readTextFile(url: URL | string): Promise<string | null>;
	getEnvironmentVariable(key: string): string | undefined;
	getCommandArgument(key: string): string | undefined;
	stringify(value: any): string | Promise<string>;
	parse(value: string): any;
}

export class Configuration {
	static readonly spec = Symbol("configuration.spec");

	options: ConfigurationOptions;

	constructor(options: ConfigurationOptions) {
		this.options = options;
	}

	//
	// Utilities
	//
	async _loadValue<T>(
		path: string | URL,
		structure: Structure<T>,
		context: StructContext,
	): Promise<T | null> {
		const text = await this.options.readTextFile(path);

		// Catch missing files and return null instead, the consumer can decide what to do
		if (!text) return null;

		// Parse the text file
		const value = this.options.parse(text);

		// Remove the JSON schema field if it is set
		delete value.$schema;

		// Process the contents
		return structure.process(value, context);
	}

	/** Wrap a primativ Structure with configuration logic */
	_primative<T>(
		struct: Structure<T>,
		options: PrimativeOptions<T>,
		deconfigure: (result: ConfigurationResult) => unknown,
	) {
		return new Structure<T>(struct.schema, (value, context) => {
			return struct.process(
				deconfigure(_parsePrimative<T>(this.options, options, value)),
				context,
			);
		});
	}

	//
	// Types
	//

	object<T extends Record<string, unknown>>(fields: {
		[K in keyof T]: Structure<T[K]>;
	}): Structure<T> {
		if (typeof fields !== "object" || fields === null) {
			throw new TypeError("options must be a non-null object");
		}
		for (const key in fields) {
			if (!(fields[key] instanceof Structure)) {
				throw new TypeError(`options[${key}] is not a Structure`);
			}
		}
		const struct = Structure.object(fields);
		Object.defineProperty(struct, Configuration.spec, {
			value: objectSpec(fields),
		});
		return struct;
	}

	array<T extends unknown>(item: Structure<T>): Structure<T[]> {
		if (!(item instanceof Structure)) {
			throw new TypeError("options is not a Structure");
		}
		const struct = Structure.array(item);
		Object.defineProperty(struct, Configuration.spec, {
			value: arraySpec(item),
		});
		return struct;
	}

	external<T extends Record<string, unknown> | Array<unknown>>(
		path: string | URL,
		struct: Structure<T>,
	): Structure<T> {
		return new Structure(struct.schema, (value, context) => {
			if (context.type !== "async") {
				throw new SyntaxError("config.external must be used async");
			}

			// Create a dummy value to return for now
			let internal: any = struct.schema.type === "array" ? [] : {};

			// Register a promise to load the actual value
			context.promises.push(async () => {
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

	string(options: PrimativeOptions<string>): Structure<string> {
		if (typeof options.fallback !== "string") {
			throw new TypeError("options.fallback must be a string");
		}

		const struct = this._primative(
			Structure.string(),
			options,
			(result) => result.value,
		);

		Object.defineProperty(struct, Configuration.spec, {
			value: primativeSpec("string", options),
		});

		return struct;
	}

	number(options: PrimativeOptions<number>): Structure<number> {
		if (typeof options.fallback !== "number") {
			throw new TypeError("options.fallback must be a number");
		}

		const struct = this._primative(Structure.number(), options, (result) =>
			_parseFloat(result),
		);

		Object.defineProperty(struct, Configuration.spec, {
			value: primativeSpec("number", options),
		});

		return struct;
	}

	boolean(options: PrimativeOptions<boolean>): Structure<boolean> {
		if (typeof options?.fallback !== "boolean") {
			throw new TypeError("options.fallback must be a boolean");
		}

		const struct = this._primative(Structure.boolean(), options, (result) =>
			_parseBoolean(result),
		);

		Object.defineProperty(struct, Configuration.spec, {
			value: primativeSpec("boolean", options),
		});

		return struct;
	}

	url(options: PrimativeOptions<string | URL>): Structure<URL> {
		if (
			typeof options.fallback !== "string" &&
			!(options.fallback instanceof URL)
		) {
			throw new TypeError("options.fallback must be a string or URL");
		}

		const opts2 = { ...options, fallback: new URL(options.fallback) };

		const struct = this._primative<URL>(Structure.url(), opts2, (result) =>
			_parseURL(result),
		);

		Object.defineProperty(struct, Configuration.spec, {
			value: primativeSpec("url", opts2),
		});

		return struct;
	}

	//
	// Methods
	//

	async load<T>(url: URL | string, struct: Structure<T>): Promise<T> {
		const context: StructContext = {
			type: "async",
			path: [],
			promises: new PromiseList(),
		};

		// Fail outside the try-catch to surface structure errors
		try {
			let obj: T | null = await this._loadValue(url, struct, context);
			if (!obj) obj = struct.process({}, context);

			await context.promises.all();

			return obj;
		} catch (error) {
			if (error instanceof Structure.Error) {
				console.error(error.toFriendlyString());
			} else {
				console.error("Configuration failed to parse");
			}
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
		const spec = getSpecification(value);
		if (!spec) return { fallback: undefined, fields: [] };
		return spec(prefix);
	}

	getJSONSchema(struct: Structure<any>) {
		return struct.getSchema();
	}
}
