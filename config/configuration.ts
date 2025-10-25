import { Structure } from "./structure.ts";
import {
	dangerouslyExpose,
	formatMarkdownTable,
	PromiseList,
} from "../core/mod.ts";
import {
	_arraySpec,
	type ConfigurationDescription,
	getSpecification,
	_objectSpec,
	type PrimativeOptions,
	_primativeSpec,
} from "./specifications.ts";
import {
	_parseBoolean,
	_parseFloat,
	_parsePrimative,
	_parseURL,
	type ConfigurationResult,
} from "./parsers.ts";
import { type StructContext } from "./struct-context.ts";

/**
 * @group Configuration
 *
 * Options for creating a platform-sepcific {@link Configuration} object,
 * different methods provide abstractions over the filesystem & parsing capabilities of the Configuration.
 *
 * For instance, you could create one that loads remote files over S3 and parses them as YAML,
 * or just a simple one that loads JSON files from the filesystem
 */
export interface ConfigurationOptions {
	/** Read in a file and decode it as text, or return null if it doesn't exist */
	readTextFile(url: URL | string): Promise<string | null>;

	/** Get a specific environment variable, or undefined if it is not set */
	getEnvironmentVariable(key: string): string | undefined;

	/** Get a specific CLI option, like `--some-thing`, or undefined if it is not set */
	getCommandArgument(key: string): string | undefined;

	/** Convert an in-memory value to a string for displaying to the user */
	stringify(value: any): string | Promise<string>;

	/** Parse a text file into in-memory values */
	parse(value: string): any;
}

/**
 * @group Configuration
 *
 * **Configuration** is both an abstraction around processing config files,
 * environment variables & CLI flags from the platform
 * and also a tool for users to declaratively define how their configuration is.
 *
 * Each platform specifies a default `options` to load JSON files,
 * but you can also construct your own if you want to customise how it works.
 *
 * With an instance, you can then define how an app's config can be specified as either configuration files,
 * CLI flag, environment variables or a combination of any of them.
 *
 * ```js
 * const config = new Configuration({
 * 	readTextFile(url) {},
 * 	getEnvironmentVariable(key) {},
 * 	getCommandArgument() {},
 * 	stringify(value) {},
 * 	parse(value) {},
 * })
 * ```
 */
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

	/**
	 * Group or nest configuration in an object.
	 *
	 * ```js
	 * config.object({
	 * 	name: config.string({ fallback: "Geoff Testington" }),
	 * 	age: config.number({ fallback: 42 }),
	 * })
	 * ```
	 */
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
			value: _objectSpec(fields),
		});
		return struct;
	}

	/**
	 * @unstable
	 *
	 * Create an ordered list of another type
	 *
	 * ```js
	 * config.array(
	 * 	Structure.string()
	 * )
	 * ```
	 */
	array<T extends unknown>(item: Structure<T>): Structure<T[]> {
		if (!(item instanceof Structure)) {
			throw new TypeError("options is not a Structure");
		}
		const struct = Structure.array(item);
		Object.defineProperty(struct, Configuration.spec, {
			value: _arraySpec(item),
		});
		return struct;
	}

	/**
	 * @unstable
	 *
	 * Load another configuration file or use value in the original configuration
	 *
	 * ```js
	 * config.external(
	 * 	new URL("./api-keys.json", import.meta.url),
	 * 	config.object({
	 * 		keys: Structure.array(Structure.string())
	 * 	})
	 * )
	 * ```
	 *
	 * Which will attempt to load "api-keys.json" and parse that,
	 * and if that doesn't exist it will also try the value in the original configuration.
	 */
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

	/**
	 * Define a string-based value with options to load from the config-file,
	 * an environment variable or a CLI flag.
	 * The only required field is **fallback**
	 *
	 * ```js
	 * config.string({
	 * 	variable: "HOSTNAME",
	 * 	flag: "--host",
	 * 	fallback: "localhost"
	 * })
	 * ```
	 */
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
			value: _primativeSpec("string", options),
		});

		return struct;
	}

	/**
	 * Define a numeric value with options to load from the config-file,
	 * an environment variable or a CLI flag.
	 * The only required field is **fallback**
	 *
	 * It will also coerce floating point numbers from strings
	 *
	 * ```js
	 * config.number({
	 * 	variable: "PORT",
	 * 	flag: "--port",
	 * 	fallback: "1234"
	 * })
	 * ```
	 */
	number(options: PrimativeOptions<number>): Structure<number> {
		if (typeof options.fallback !== "number") {
			throw new TypeError("options.fallback must be a number");
		}

		const struct = this._primative(Structure.number(), options, (result) =>
			_parseFloat(result),
		);

		Object.defineProperty(struct, Configuration.spec, {
			value: _primativeSpec("number", options),
		});

		return struct;
	}

	/**
	 * Define a boolean value with options to load from the config-file,
	 * an environment variable or a CLI flag.
	 * The only required field is **fallback**
	 *
	 * There are extra coercions for boolean-like strings
	 *
	 * - `1`, `true` & `yes` coerce to true
	 * - `0`, `false` & `no` coerce to false
	 *
	 * ```js
	 * config.boolean({
	 * 	variable: "USE_SSL",
	 * 	flag: "--ssl",
	 * 	fallback: false
	 * })
	 * ```
	 */
	boolean(options: PrimativeOptions<boolean>): Structure<boolean> {
		if (typeof options?.fallback !== "boolean") {
			throw new TypeError("options.fallback must be a boolean");
		}

		const struct = this._primative(Structure.boolean(), options, (result) =>
			_parseBoolean(result),
		);

		Object.defineProperty(struct, Configuration.spec, {
			value: _primativeSpec("boolean", options),
		});

		return struct;
	}

	/**
	 * Define a URL based value, the value is validated and converted into a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL).
	 *
	 * ```js
	 * config.url({
	 * 	variable: "SELF_URL",
	 * 	flag: "--url",
	 * 	fallback: "http://localhost:1234"
	 * })
	 * ```
	 */
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
			value: _primativeSpec("url", opts2),
		});

		return struct;
	}

	//
	// Methods
	//

	/**
	 * Load configuration with a base file, also pulling in environment variables and CLI flags using {@link ConfigurationOptions}
	 *
	 * ```js
	 * const struct = config.object({
	 * 	env: config.string({ variable: "NODE_ENV", fallback: "development" })
	 * })
	 *
	 * config.load(
	 * 	new URL("./app-config.json", import.meta.url),
	 * 	struct
	 * )
	 * ```
	 *
	 * It will asynchronously load the configuration, validate it and return the coerced value.
	 * If it fails it will output a friendly string listing what is wrong and throw the Structure.Error
	 */
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

	/**
	 * Given a structure defined using Configuration, generate human-readable usage information.
	 * The usage includes a table of all configuration options and what the default value would be if no other soruces are used.
	 *
	 * Optionally, output the current value of the configuration too.
	 */
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
			lines.push(
				"",
				"",
				"Current:",
				JSON.stringify(dangerouslyExpose(currentValue), null, 2),
			);
		}

		return lines.join("\n");
	}

	/**
	 * @ignore
	 *
	 * Given a structure defined using configuration, get meta-information about it
	 */
	describe(value: unknown, prefix = ""): ConfigurationDescription {
		const spec = getSpecification(value);
		if (!spec) return { fallback: undefined, fields: [] };
		return spec(prefix);
	}

	/**
	 * @unstable
	 *
	 * Given a structure defined using configuration, generate a JSON Schema to validate it. This could be useful to write to a file then use a IDE-based validator using something like
	 *
	 * ```json
	 * {
	 * 	"$schema": "./app-config.schema.json",
	 * }
	 * ```
	 */
	getJSONSchema(struct: Structure<any>) {
		return struct.getFullSchema();
	}
}
