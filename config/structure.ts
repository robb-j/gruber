import { DEFAULT_CONTEXT, StructContext } from "./struct-context.ts";
import { StructuralError } from "./structural-error.ts";

export type Schema = Record<string, unknown>;

export type StructExec<T> = (input?: unknown, context?: StructContext) => T;

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
	schema: Schema;
	_process: StructExec<T>;
	constructor(schema: Schema, process: StructExec<T>) {
		this.schema = schema;
		this._process = process;
	}

	process(input: unknown, context: StructContext = DEFAULT_CONTEXT) {
		try {
			return this._process(input, context);
		} catch (error) {
			throw StructuralError.chain(error, context.path);
		}
	}

	getSchema(): Schema {
		return {
			$schema: "https://json-schema.org/draft/2020-12/schema",
			...this.schema,
		};
	}

	static string(fallback?: string | undefined): Structure<string> {
		const schema: Schema = { type: "string" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure(schema, (input = fallback, context = undefined) => {
			if (input === undefined) {
				throw new StructuralError("Missing value", context?.path);
			}
			if (typeof input !== "string") {
				throw new StructuralError("Expected a string", context?.path);
			}
			return input;
		});
	}

	static number(fallback?: number | undefined): Structure<number> {
		const schema: Schema = { type: "number" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure(schema, (input = fallback, context = undefined) => {
			if (input === undefined) {
				throw new StructuralError("Missing value", context?.path);
			}
			// if (typeof input === "string") {
			// 	const parsed = Number.parseFloat(input);
			// 	if (!Number.isNaN(parsed)) return parsed;
			// }
			if (typeof input !== "number") {
				throw new StructuralError("Expected a number", context?.path);
			}
			if (Number.isNaN(input)) {
				throw new StructuralError("Not a number", context?.path);
			}
			return input;
		});
	}

	static boolean(fallback?: boolean | undefined): Structure<boolean> {
		const schema: Schema = { type: "boolean" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure<boolean>(schema, (input = fallback, context) => {
			if (input === undefined) {
				throw new StructuralError("Missing value", context?.path);
			}
			if (typeof input !== "boolean") {
				throw new StructuralError("Not a boolean", context?.path);
			}
			return input;
		});
	}

	static url(fallback?: string | URL | undefined): Structure<URL> {
		const schema: Schema = { type: "string", format: "uri" };
		if (fallback !== undefined) schema.default = fallback.toString();

		// ~ make sure the fallback is valid ~
		const url = fallback ? new URL(fallback) : undefined;
		return new Structure(schema, (input = url, context = undefined) => {
			if (input === undefined) {
				throw new StructuralError("Missing value", context?.path);
			}
			if (input instanceof URL) return input;
			if (typeof input !== "string") {
				throw new StructuralError("Not a string or URL", context?.path);
			}
			return new URL(input);
		});
	}

	static object<T extends Record<string, Structure<unknown>>>(
		fields: T,
	): Structure<InferObject<T>> {
		const schema = {
			type: "object",
			properties: {} as Record<string, unknown>,
			default: {},
			additionalProperties: false,
		};
		for (const [key, struct] of Object.entries(fields)) {
			schema.properties[key] = struct.schema;
		}
		return new Structure(schema, (input: any = {}, context = undefined) => {
			const path = context?.path ?? [];
			if (input && typeof input !== "object") {
				throw new StructuralError("Expected an object", path);
			}
			if (Object.getPrototypeOf(input) !== Object.getPrototypeOf({})) {
				throw new StructuralError("Should not have a prototype", path);
			}
			const output: any = {};
			const errors = [];
			for (const key in fields) {
				const ctx = { path: [...path, key] };
				try {
					output[key] = fields[key].process(input[key], ctx);
				} catch (error) {
					errors.push(StructuralError.chain(error, ctx.path));
				}
			}

			for (const key of _additionalProperties(fields, input)) {
				errors.push(
					new StructuralError("Additional field not allowed", [...path, key]),
				);
			}

			if (errors.length > 0) {
				throw new StructuralError("Object does not match schema", path, errors);
			}
			return output as InferObject<T>;
		});
	}

	static array<T extends Structure<unknown>>(
		struct: T,
	): Structure<Array<Infer<T>>> {
		const schema: Schema = {
			type: "array",
			items: struct.schema,
			default: [],
		};
		return new Structure(schema, (input = [], context = undefined) => {
			const path = context?.path ?? [];
			if (!Array.isArray(input)) {
				throw new StructuralError("Expected an array", path);
			}
			const output = [];
			const errors = [];
			for (let i = 0; i < input.length; i++) {
				const ctx = { path: [...path, `${i}`] };
				try {
					output.push(struct.process(input[i], ctx));
				} catch (error) {
					errors.push(StructuralError.chain(error, ctx.path));
				}
			}
			if (errors.length > 0) {
				throw new StructuralError(
					"Array item does not match schema",
					path,
					errors,
				);
			}
			return output as Array<Infer<T>>;
		});
	}

	static literal<T extends string | number | boolean>(value: T): Structure<T> {
		const schema = { type: typeof value, const: value };

		return new Structure(schema, (input, context = undefined) => {
			if (input === undefined) {
				throw new StructuralError("Missing value", context?.path);
			}
			if (input !== value) {
				throw new StructuralError(
					`Expected ${schema.type} literal: ${value}`,
					context?.path,
				);
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
		return new Structure(schema, (value, context = undefined) => {
			for (const type of types) {
				try {
					return type.process(value) as Infer<T[number]>;
				} catch {
					// ...
				}
			}
			throw new StructuralError(
				"does not match any type in the union",
				context?.path,
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
}
