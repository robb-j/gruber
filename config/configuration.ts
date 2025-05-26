import { Structure, Infer } from "./structure.ts";
import { StructuralError } from "./structural-error.ts";
import { formatMarkdownTable } from "../core/mod.ts";
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
			value: objectSpec(options),
		});
		return struct;
	}

	array<T extends Structure<unknown>>(options: T): Structure<Infer<T>[]> {
		if (!(options instanceof Structure)) {
			throw new TypeError("options is not a Structure");
		}
		const struct = Structure.array(options);
		Object.defineProperty(struct, Configuration.spec, {
			value: arraySpec(options),
		});
		return struct;
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

	async load<T>(url: URL | string, struct: Structure<T>): Promise<T> {
		const file = await this.options.readTextFile(url);

		// Catch missing files and create a default configuration
		if (!file) {
			return struct.process({});
		}

		// Fail outside the try-catch to surface structure errors
		try {
			const value = await this.options.parse(file);
			delete value.$schema;
			return struct.process(value);
		} catch (error) {
			console.error("Configuration failed to parse");
			if (error instanceof StructuralError) {
				error.message = error.toFriendlyString();
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
