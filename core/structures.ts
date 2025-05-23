// export interface StructContext {
// 	type: 'sync' | 'async'
// 	path: string[];
// 	promises?: Promise<unknown>[];
// }

import { PromiseChain } from "./utilities.ts";

export type StructContext =
	| { type: "sync"; path: string[] }
	| {
			type: "async";
			path: string[];
			// promises: Promise<unknown>[];
			promise: PromiseChain;
	  };

function _nestContext(input: StructContext, key: string): StructContext {
	return { ...input, path: input.path.concat(key) };
}

// export interface StructOptions<Type, Schema> {
// 	type: 'object' | 'string' | 'url'
// }

// /**
//  * @template Type
//  * @template Schema
//  * @typedef {object} StructOptions
//  * @property {'object' | 'string' | 'url'} type
//  * @property {Schema} schema
//  * @property {(value: unknown, ctx: StructContext) => Type} fn
//  */

const DEFAULT_CONTEXT: StructContext = { type: "sync", path: [] };

export class StructError extends Error {
	path: string[];
	children: StructError[];
	constructor(
		message: string,
		path: string[] = [],
		children: StructError[] = [],
	) {
		super(message);
		this.path = path;
		this.children = children;
		this.name = "StructError";
		Error.captureStackTrace(this, StructError);
	}

	static chain(
		error: unknown,
		context: StructContext = DEFAULT_CONTEXT,
	): StructError {
		let chained;
		if (error instanceof StructError) {
			// If a StructError is thrown, trust it
			return error;
		} else if (error instanceof Error) {
			chained = new StructError(error.message, context.path);
		} else {
			chained = new StructError("Unknown error", context.path);
		}
		Error.captureStackTrace(chained, StructError.chain);
		return chained;
	}

	getOneLiner() {
		return (this.path.join(".") || ".") + " — " + this.message;
	}

	*[Symbol.iterator](): Iterator<StructError> {
		if (this.children.length === 0) {
			yield this;
		} else {
			for (const child of this.children) {
				yield* child;
			}
		}
	}

	toFriendlyString(): string {
		const messages = [];
		for (const child of this) {
			messages.push("  " + child.getOneLiner());
		}

		return [
			this.message,
			...messages.toSorted((a, b) => a.localeCompare(b)),
		].join("\n");
	}

	// recursion!!!
	// get message() {
	// 	return this.toFriendlyString();
	// }
}

export { StructError as StructureError };

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
			throw StructError.chain(error, context);
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
			// if (typeof input === "string") {
			// 	const parsed = Number.parseFloat(input);
			// 	if (!Number.isNaN(parsed)) return parsed;
			// }
			if (typeof input !== "number") {
				throw new Error("Expected a number");
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
				const ctx = _nestContext(context, key);
				try {
					output[key] = fields[key].process(input[key], ctx);
				} catch (error) {
					errors.push(StructError.chain(error, ctx));
				}
			}

			for (const key of _additionalProperties(fields, input)) {
				errors.push(
					new StructError(
						"Additional field not allowed",
						context.path.concat(key),
					),
				);
			}

			if (errors.length > 0) {
				throw new StructError(
					"Object does not match schema",
					context.path,
					errors,
				);
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
		return new Structure(schema, (input = [], context) => {
			if (!Array.isArray(input)) throw new Error("Expected an array");

			const output = [];
			const errors = [];
			for (let i = 0; i < input.length; i++) {
				const ctx = _nestContext(context, i.toString());
				try {
					output.push(struct.process(input[i], ctx));
				} catch (error) {
					errors.push(StructError.chain(error, ctx));
				}
			}
			if (errors.length > 0) {
				throw new StructError(
					"Array item does not match schema",
					context.path,
					errors,
				);
			}
			return output as Array<Infer<T>>;
		});
	}

	/**
	 * **UNSTABLE** use at your own risk
	 */
	static literal<T extends string | number | boolean>(value: T): Structure<T> {
		const schema = { type: typeof value, const: value };

		return new Structure(schema, (input) => {
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
	 * **UNSTABLE** use at your own risk
	 */
	static union<T extends Structure<unknown>[]>(
		types: T,
	): Structure<Infer<T[number]>> {
		const schema = {
			oneOf: types.map((s) => s.schema),
		};
		return new Structure(schema, (value) => {
			for (const type of types) {
				try {
					return type.process(value) as Infer<T[number]>;
				} catch {
					// ...
				}
			}
			throw new Error("does not match any type in the union");
		});
	}
}
