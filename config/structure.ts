import type { StandardSchemaV1 } from "./standard-schema.ts";
import { _nestContext, type StructContext } from "./struct-context.ts";
import { _StructError } from "./struct-error.ts";

// NOTE: Structure types should inline types where possible to expose the raw type to consumers,
// not a Partial, Infer or InferObject

export type Schema = Record<string, unknown>;

export type StructExec<T> = (input: unknown, context: StructContext) => T;

export type Infer<T> = T extends Structure<infer U> ? U : never;

export type InferObject<T> = { [K in keyof T]: Infer<T[K]> };

export function _additionalProperties(
	fields: Record<string, unknown>,
	input: Record<string, unknown>,
) {
	const allowed = new Set(Object.keys(fields));
	return Array.from(Object.keys(input)).filter((key) => !allowed.has(key));
}

/**
 * @group Structure
 *
 * **Structure** is a composable primative for processing values to make sure they are what you expect them to be, optionally coercing the value into something else. It's also strongly-typed so values that are validated have the correct TypeScript type too.
 *
 * The Structure class also supports [StandardSchema v1](https://standardschema.dev) so you can use it anywhere that supports that standard.
 */
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

	/**
	 * Execute the structure by passing it a value and getting back the result if it is successful, otherwise a {@link Structure.Error} is thrown
	 */
	process(
		input: unknown = undefined,
		context: StructContext = { type: "sync", path: [] },
	) {
		try {
			return this._process(input, context);
		} catch (error) {
			throw Structure.Error.chain(error, context.path);
		}
	}

	/**
	 * Get a JSON schema from the structure, where equivalent fields are available.
	 */
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

	/**
	 * Define a string-based value with an optional `fallback`.
	 *
	 * ```js
	 * Structure.string()
	 * Structure.string("Geoff Testington")
	 * ```
	 */
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

	/**
	 * Define a number-based value with an optional `fallback`,
	 * it will also try to parse floating-point values from strings.
	 *
	 * ```js
	 * Structure.number()
	 * Structure.number("Geoff Testington")
	 * ```
	 */
	static number(fallback?: number | undefined): Structure<number> {
		const schema: Schema = { type: "number" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure(schema, (input = fallback) => {
			if (input === undefined) {
				throw new Error("Missing value");
			}
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

	/**
	 * Define a boolean value with an optional `fallback`.
	 *
	 * ```js
	 * Structure.boolean()
	 * Structure.boolean(false)
	 * ```
	 */
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

	/**
	 * Define a URL value with an optional `fallback`,
	 * that will be coerced into a `URL`.
	 *
	 * ```js
	 * Structure.url()
	 * Structure.url("http://example.com")
	 * Structure.url(new URL("http://example.com"))
	 * ```
	 */
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

	/**
	 * Define a group of structures under an object.
	 * Each field needs to matched their respective Structures and no additionaly fields are allowed.
	 *
	 * ```js
	 * Structure.object({
	 * 	name: Structure.string(),
	 * 	age: Structure.number(),
	 * })
	 * ```
	 */
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

	/**
	 * Define a list of values that each match the same structure.
	 *
	 * ```js
	 * // An array of strings
	 * Structure.array(
	 * 	Structure.string()
	 * )
	 *
	 * // An array of objects
	 * Structure.array(
	 * 	Structure.object({
	 * 		name: Structure.string(),
	 * 		age: Structure.number()
	 * 	})
	 * )
	 * ```
	 */
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

	/**
	 * Define a specific value that must be exactly equal.
	 *
	 *
	 * ```js
	 * Structure.literal("click_event")
	 * Structure.literal(42)
	 * Structure.literal(true)
	 * ```
	 */
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

	/**
	 * Define a Structure that must match one of a set of Structures
	 *
	 * ```js
	 * Structure.union([
	 * 	Structure.object({
	 * 		type: Structure.literal("click"),
	 * 		element: Structure.string()
	 * 	}),
	 * 	Structure.object({
	 * 		type: Structure.literal("login"),
	 * 	}),
	 * ])
	 * ```
	 */
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

	/**
	 * @unstable
	 *
	 * Attempts to create a Structure from a parsed [JSON Schema](https://json-schema.org/specification) value.
	 * This is implemented on a as-needed bases, currently it supports:
	 * - "const" → `Structure.literal`
	 * - type=string → `Structure.string`
	 * - type=number → `Structure.number`
	 * - type=boolean → `Structure.boolean`
	 * - type=array → "items" are recursively parsed and put into a `Structure.array`
	 * - type=object → "properties" are recursively parsed and put into a `Structure.object`
	 * - anyOf → `Structure.union`
	 *
	 * ```js
	 * Structure.fromJSONSchema({ type: "string" })
	 * Structure.fromJSONSchema({ type: "number" })
	 * Structure.fromJSONSchema({ type: "boolean" })
	 * Structure.fromJSONSchema({
	 *   type: "object",
	 *   properties: {
	 *     name: { type:"string" },
	 *     age: { type: "number" }
	 *   },
	 *   required: ["name"]
	 * })
	 * Structure.fromJSONSchema({ type: "array", items: { type: "string" } })
	 * Structure.fromJSONSchema({
	 *   anyOf: [
	 *     { type: "string" },
	 *     { type: "number" }
	 *   ]
	 * });
	 * ```
	 *
	 * notes
	 * - array "prefixItems" are not supported, maybe they could be mapped to tuples?
	 */
	static fromJSONSchema(schema: any): Structure<any> {
		if (schema.const) return Structure.literal(schema.const);
		if (schema.type === "string") return Structure.string(schema.default);
		if (schema.type === "number") return Structure.number(schema.default);
		if (schema.type === "boolean") return Structure.boolean(schema.default);
		if (schema.type === "array") {
			return Structure.array(Structure.fromJSONSchema(schema.items));
		}
		if (schema.type === "object" && typeof schema.properties === "object") {
			const fields: any = {};
			const required = new Set(schema.required ?? []);
			for (const [key, childSchema] of Object.entries(schema.properties)) {
				const childStruct = Structure.fromJSONSchema(childSchema);
				fields[key] = required.has(key)
					? childStruct
					: Structure.optional(childStruct);
			}
			return Structure.object(fields);
		}
		if (Array.isArray(schema.anyOf)) {
			return Structure.union(
				schema.anyOf.map((t: any) => Structure.fromJSONSchema(t)),
			);
		}
		throw new TypeError("Unknown schema");
	}

	/**
	 * @unstable
	 *
	 * Creates a Structure for arrays where each index has a different validation
	 *
	 * ```js
	 * Structure.tuple([Structure.string(), Structure.number()])
	 * ```
	 */
	static tuple<const T extends Structure<any>[]>(
		types: T,
	): Structure<InferObject<T>> {
		const schema = {
			type: "array",
			prefixItems: types.map((t) => t.schema),
		};
		return new Structure(schema, (value, context) => {
			if (!Array.isArray(value)) throw new Error("Not an array");
			if (value.length !== types.length) throw new Error("Incorrect length");

			let output: InferObject<T> = [] as any;
			let errors: any[] = [];
			for (let i = 0; i < types.length; i++) {
				const childContext = _nestContext(context, `${i}`);
				try {
					output.push(types[i].process(value[i], childContext));
				} catch (error) {
					errors.push(Structure.Error.chain(error, childContext));
				}
			}
			if (errors.length > 0) {
				throw new Structure.Error(
					"Tuple value does not match schema",
					context.path,
					errors,
				);
			}
			return output;
		});
	}

	/**
	 * Define a Structure to validate the value is `null`
	 *
	 * ```js
	 * Structure.null()
	 * ```
	 */
	static null() {
		return new Structure({ type: "null" }, (value) => {
			if (value !== null) throw new Error("value is not null");
			return value;
		});
	}

	/**
	 * Define a Structure that lets any value through
	 *
	 * ```js
	 * Structure.any()
	 * ```
	 */
	static any() {
		return new Structure<any>({}, (value) => value);
	}

	/**
	 * Create a Structure that validates an object where some or none of the fields match their respective Structures.
	 * Only fields specified may be set, nothing additional.
	 *
	 * ```js
	 * Structure.partial({
	 * 	name: Structure.string(),
	 * 	age: Structure.number()
	 * })
	 * ```
	 */
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

	/**
	 * Creates a Structure that validates dates or values that can be turned into dates
	 * through the [Date constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date).
	 *
	 * ```js
	 * Structure.date()
	 * ```
	 */
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

	/**
	 * Creates a Structure that validates a value is either another structure or a null value
	 *
	 * ```js
	 * Structure.nullable(Structure.string())
	 * ```
	 */
	static nullable<T>(input: Structure<T>) {
		return Structure.union([Structure.null(), input]);
	}

	/**
	 * Creates a Structure that validates a value is one of a set of literals
	 *
	 * ```js
	 * Structure.enum(['a string', 42, false])
	 * ```
	 */
	static enum<T extends (string | number | boolean)[]>(values: T) {
		return Structure.union(values.map((v) => Structure.literal(v)));
	}

	/**
	 * Creates a Structure that validates a value is the `undefined` value
	 *
	 * ```js
	 * Structure.undefined()
	 * ```
	 */
	static undefined() {
		return new Structure<undefined>({}, (value) => {
			if (value !== undefined) throw new Error('value is not "undefined"');
			else return undefined;
		});
	}

	/**
	 * Creates a Structure that validates another structure or is not defined
	 *
	 * ```js
	 * Structure.optional(Structure.string())
	 * ```
	 */
	static optional<T>(input: Structure<T>) {
		return Structure.union([input, Structure.undefined()]);
	}
}
