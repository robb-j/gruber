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

export type ConfigurationResult<T> =
	| { source: "argument"; value: string | T }
	| { source: "variable"; value: string | T }
	// | { source: "current"; value: T }
	| { source: "fallback"; value: T };

const _booleans: Record<string, boolean | undefined> = {
	1: true,
	true: true,
	yes: true,
	0: false,
	false: false,
	no: false,
};

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

	_getValue<T>(options: PrimativeOptions<T>): ConfigurationResult<T> {
		const argument = options.flag
			? this.options.getCommandArgument(options.flag)
			: null;
		if (argument) return { source: "argument", value: argument };

		const variable = options.variable
			? this.options.getEnvironmentVariable(options.variable)
			: null;
		if (variable) return { source: "variable", value: variable };

		// if (typeof current !== undefined) {
		// 	return { source: "current", value: current };
		// }

		return { source: "fallback", value: options.fallback };
	}

	_primative<T>(
		struct: Structure<T>,
		options: PrimativeOptions<T>,
		deconfigure: (result: ConfigurationResult<T>) => T,
	) {
		return new Structure<T>(struct.schema, (value, context) => {
			const configured = this._getValue(options);

			return struct.process(
				configured.source === "argument" || configured.source === "variable"
					? deconfigure(configured)
					: (value ?? options.fallback),
				context,
			);
		});
	}

	_parseFloat(value: ConfigurationResult<number>): number {
		if (typeof value === "string") {
			const parsed = Number.parseFloat(value);
			if (Number.isNaN(parsed)) {
				throw TypeError(`Invalid number: ${value}`);
			}
			return parsed;
		}
		if (typeof value === "number") {
			return value;
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

	string(options: PrimativeOptions<string>): Structure<string> {
		if (typeof options?.fallback !== "string") {
			throw new SyntaxError("options.fallback must be a string");
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
			throw new SyntaxError("options.fallback must be a number");
		}

		const struct = this._primative(Structure.number(), options, (result) =>
			this._parseFloat(result),
		);

		Object.defineProperty(struct, Configuration.spec, {
			value: primativeSpec("number", options),
		});

		return struct;
	}

	boolean(options: PrimativeOptions<boolean>): Structure<boolean> {
		if (typeof options?.fallback !== "boolean") {
			throw new SyntaxError("options.fallback must be a boolean");
		}

		const struct = this._primative(Structure.boolean(), options, (result) =>
			this._parseBoolean(result),
		);

		Object.defineProperty(struct, Configuration.spec, {
			value: primativeSpec("boolean", options),
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
