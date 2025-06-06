import type { StandardSchemaV1 } from "./standard-schema.ts";
import {
	_nestContext,
	DEFAULT_CONTEXT,
	StructContext,
} from "./struct-context.ts";
import { _StructError } from "./struct-error.ts";

// NOTE: Structure types should inline types where possible to expose the raw type to consumers,
// not a Partial, Infer or InferObject

export type Schema = Record<string, unknown>;

export type StructExec<T> = (input: unknown, context: StructContext) => T;

export type Infer<T> = T extends Structure<infer U> ? U : never;

export type InferObject<T> = { [K in keyof T]: Infer<T[K]> };

function _additionalProperties(
	fields: Record<string, unknown>,
	input: Record<string, unknown>,
) {
	const allowed = new Set(Object.keys(fields));
	return Array.from(Object.keys(input)).filter((key) => !allowed.has(key));
}

export class Structure<T> {
	static Error = _StructError;

	readonly "~standard": StandardSchemaV1.Props<unknown, T> = {
		version: 1,
		vendor: "gruber",
		validate: (value) => {
			try {
				return { value: this.process(value) };
			} catch (error) {
				return { issues: (error as _StructError).getStandardSchemaIssues() };
			}
			// return
		},
	};

	schema: Schema;
	_process: StructExec<T>;
	constructor(schema: Schema, process: StructExec<T>) {
		this.schema = schema;
		this._process = process;
	}

	process(
		input: unknown = undefined,
		context: StructContext = DEFAULT_CONTEXT,
	) {
		try {
			return this._process(input, context);
		} catch (error) {
			throw Structure.Error.chain(error, context.path);
		}
	}

	getFullSchema(): Schema {
		return {
			$schema: "https://json-schema.org/draft/2020-12/schema",
			...this.schema,
		};
	}

	/** @deprecated use {@link getFullSchema} */
	getSchema(): Schema {
		return this.getFullSchema();
	}

	static string(fallback?: string | undefined): Structure<string> {
		const schema: Schema = { type: "string" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure(schema, (input = fallback) => {
			if (input === undefined) {
				throw new Error("Missing value");
			}
			if (typeof input !== "string") {
				throw new Error("Expected a string");
			}
			return input;
		});
	}

	static number(fallback?: number | undefined): Structure<number> {
		const schema: Schema = { type: "number" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure(schema, (input = fallback) => {
			if (input === undefined) {
				throw new Error("Missing value");
			}
			// TODO: this needs testing
			if (typeof input === "string") {
				const parsed = Number.parseFloat(input);
				if (!Number.isNaN(parsed)) return parsed;
			}
			if (typeof input !== "number") {
				throw new Error("Expected a number");
			}
			if (Number.isNaN(input)) {
				throw new Error("Not a number");
			}
			return input;
		});
	}

	static boolean(fallback?: boolean | undefined): Structure<boolean> {
		const schema: Schema = { type: "boolean" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure<boolean>(schema, (input = fallback) => {
			if (input === undefined) {
				throw new Error("Missing value");
			}
			if (typeof input !== "boolean") {
				throw new Error("Not a boolean");
			}
			return input;
		});
	}

	static url(fallback?: string | URL | undefined): Structure<URL> {
		const schema: Schema = { type: "string", format: "uri" };
		if (fallback !== undefined) schema.default = fallback.toString();

		// ~ make sure the fallback is valid ~
		const url = fallback ? new URL(fallback) : undefined;
		return new Structure(schema, (input = url) => {
			if (input === undefined) {
				throw new Error("Missing value");
			}
			if (input instanceof URL) return input;
			if (typeof input !== "string") {
				throw new Error("Not a string or URL");
			}
			return new URL(input);
		});
	}

	static object<T extends Record<string, unknown>>(fields: {
		[K in keyof T]: Structure<T[K]>;
	}): Structure<T> {
		const schema = {
			type: "object",
			properties: {} as Record<string, unknown>,
			default: {},
			additionalProperties: false,
			required: Object.keys(fields),
		};
		for (const [key, struct] of Object.entries(fields)) {
			schema.properties[key] = struct.schema;
		}
		return new Structure(schema, (input: any = {}, context) => {
			if (input && typeof input !== "object") {
				throw new Error("Expected an object");
			}
			if (Object.getPrototypeOf(input) !== Object.getPrototypeOf({})) {
				throw new Error("Should not have a prototype");
			}
			const output: any = {};
			const errors = [];
			for (const key in fields) {
				const childContext = _nestContext(context, key);
				try {
					output[key] = fields[key].process(input[key], childContext);
					if (output[key] === undefined) delete output[key];
				} catch (error) {
					errors.push(Structure.Error.chain(error, childContext.path));
				}
			}

			for (const key of _additionalProperties(fields, input)) {
				errors.push(
					new Structure.Error(
						"Additional field not allowed",
						_nestContext(context, key).path,
					),
				);
			}

			if (errors.length > 0) {
				throw new Structure.Error(
					"Object does not match schema",
					context.path,
					errors,
				);
			}
			return output as T;
		});
	}

	static array<T extends unknown>(struct: Structure<T>): Structure<Array<T>> {
		const schema: Schema = {
			type: "array",
			items: struct.schema,
			default: [],
		};
		return new Structure(schema, (input = [], context) => {
			if (!Array.isArray(input)) {
				throw new Error("Expected an array");
			}
			const output: T[] = [];
			const errors = [];
			for (let i = 0; i < input.length; i++) {
				const childContext = _nestContext(context, i.toString());
				try {
					output.push(struct.process(input[i], childContext));
				} catch (error) {
					errors.push(Structure.Error.chain(error, childContext.path));
				}
			}
			if (errors.length > 0) {
				throw new Structure.Error(
					"Array item does not match schema",
					context.path,
					errors,
				);
			}
			return output;
		});
	}

	static literal<T extends string | number | boolean>(value: T): Structure<T> {
		const schema = { type: typeof value, const: value };

		return new Structure(schema, (input, context) => {
			if (input === undefined) {
				throw new Error("Missing value");
			}
			if (input !== value) {
				throw new Error(`Expected ${schema.type} literal: ${value}`);
			}
			return value;
		});
	}

	static union<T extends Structure<unknown>[]>(
		types: T,
	): Structure<Infer<T[number]>> {
		const schema = {
			oneOf: types.map((s) => s.schema),
		};
		return new Structure(schema, (value, context) => {
			const errors = [];
			for (const key in types) {
				try {
					const childContext = _nestContext(context, `[${key}]`);
					return types[key].process(value, childContext) as Infer<T[number]>;
				} catch (error) {
					errors.push(Structure.Error.chain(error, context));
				}
			}
			throw new Structure.Error(
				"Does not match any types in the union",
				context?.path,
				errors,
			);
		});
	}

	static null() {
		return new Structure({ type: "null" }, (value) => {
			if (value !== null) throw new Error("value is not null");
			return value;
		});
	}

	static any() {
		return new Structure<any>({}, (value) => value);
	}

	static partial<T extends Record<string, unknown>>(fields: {
		[K in keyof T]: Structure<T[K]>;
	}): Structure<{ [K in keyof T]?: T[K] }> {
		const schema = {
			type: "object",
			properties: {} as Record<string, unknown>,
			default: {},
			additionalProperties: false,
		};

		// Set child schemas
		for (const [key, struct] of Object.entries(fields)) {
			schema.properties[key] = struct.schema;
		}

		return new Structure(schema, (input: any = {}, context) => {
			if (input && typeof input !== "object") {
				throw new Error("Expected an object");
			}
			if (Object.getPrototypeOf(input) !== Object.getPrototypeOf({})) {
				throw new Error("Should not have a prototype");
			}

			// validate properties, if they are set
			const output: any = {};
			const errors = [];
			for (const key in fields) {
				if (input[key] === undefined) continue;
				const childContext = _nestContext(context, key);
				try {
					output[key] = fields[key].process(input[key], childContext);
				} catch (error) {
					errors.push(Structure.Error.chain(error, childContext));
				}
			}

			for (const key of _additionalProperties(fields, input)) {
				errors.push(
					new Structure.Error(
						"Additional field not allowed",
						_nestContext(context, key).path,
					),
				);
			}

			if (errors.length > 0) {
				throw new Structure.Error(
					"Object does not match schema",
					context.path,
					errors,
				);
			}
			return output as Partial<T>;
		});
	}

	static date(): Structure<Date> {
		return new Structure({ type: "string", format: "date-time" }, (value) => {
			if (value instanceof Date) return value;
			if (typeof value === "string") {
				const date = new Date(value);
				if (Number.isNaN(date.getTime())) {
					throw new Error("invalid string date");
				}
				return date;
			}
			throw new Error("not a Date");
		});
	}
}
