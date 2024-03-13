/** @typedef {{ path: string[] }} StructContext */

/**
 * @template Type
 * @template Schema
 * @typedef {object} StructOptions
 * @property {'object' | 'string' | 'url'} type
 * @property {Schema} schema
 * @property {(value: unknown, ctx: StructContext) => Type} fn
 */

const DEFAULT_CONTEXT = { path: [] };

export class StructError extends Error {
	/**
	 * @param {string} message
	 * @param {string[]} path
	 * @param {StructError[]} children
	 */
	constructor(message, path = [], children = []) {
		super(message);
		this.path = path;
		this.children = children;
		this.name = "StructError";
		Error.captureStackTrace(this, StructError);
	}

	/**
	 * @param {unknown} error
	 * @param {StructContext} context
	 * @returns {StructError}
	 */
	static chain(error, context = DEFAULT_CONTEXT) {
		let chained;
		if (error instanceof StructError) {
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

	/** @returns {Iterator<StructError>} */
	*[Symbol.iterator]() {
		if (this.children.length === 0) {
			yield this;
		} else {
			for (const child of this.children) {
				yield* child;
			}
		}
	}

	toFriendlyString() {
		const messages = [];
		for (const child of this) {
			messages.push("  " + child.getOneLiner());
		}

		return [
			this.message,
			...messages.toSorted((a, b) => a.localeCompare(b)),
		].join("\n");
	}
}

/**
 * @typedef {Record<string,unknown>} Schema
 */

/**
 * @template T
 * @typedef {(input?: unknown, context?: StructContext) => T} StructExec
 */

/**
 * @template T
 * @typedef {T extends Structure<infer U> ? U : never} Infer
 */

/**
 * @template T
 */
export class Structure {
	/**
	 * @param {Schema} schema
	 * @param {StructExec<T>} process
	 */
	constructor(schema, process) {
		this.schema = schema;
		this.process = process;
	}

	getSchema() {
		return {
			$schema: "https://json-schema.org/draft/2019-09/schema",
			...this.schema,
		};
	}

	/**
	 * @param {string} [fallback]
	 * @returns {Structure<string>}
	 */
	static string(fallback = undefined) {
		const schema = { type: "string" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure(schema, (input = fallback, context = undefined) => {
			if (input === undefined) {
				throw new StructError("Missing value", context?.path);
			}
			if (typeof input !== "string") {
				throw new StructError("Expected a string", context?.path);
			}
			return input;
		});
	}

	/**
	 * @param {number} [fallback]
	 * @returns {Structure<number>}
	 */
	static number(fallback) {
		const schema = { type: "number" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure(schema, (input = fallback, context = undefined) => {
			if (input === undefined) {
				throw new StructError("Missing value", context?.path);
			}
			// if (typeof input === "string") {
			// 	const parsed = Number.parseFloat(input);
			// 	if (!Number.isNaN(parsed)) return parsed;
			// }
			if (typeof input !== "number") {
				throw new StructError("Expected a number", context?.path);
			}
			return input;
		});
	}

	/**
	 * @param {boolean} fallback
	 * @returns {Structure<boolean>}
	 */
	static boolean(fallback) {
		const schema = { type: "boolean" };
		if (fallback !== undefined) schema.default = fallback;

		return new Structure(schema, (input, context) => {
			if (input === undefined) return fallback;
			if (typeof input !== "boolean") {
				throw new StructError("Not a boolean", context?.path);
			}
			return input;
		});
	}

	/**
	 * @param {string | URL} [fallback]
	 * @returns {Structure<URL>}
	 */
	static url(fallback) {
		const schema = { type: "string", format: "uri" };
		if (fallback !== undefined) schema.default = fallback.toString();

		// ~ make sure the fallback is valid ~
		const url = fallback ? new URL(fallback) : undefined;
		return new Structure(schema, (input = url, context = undefined) => {
			if (input === undefined) {
				throw new StructError("Missing value", context?.path);
			}
			if (input instanceof URL) return input;
			if (typeof input !== "string") {
				throw new StructError("Not a string or URL", context?.path);
			}
			return new URL(input);
		});
	}

	/**
	 * @template {Record<string, Structure<any>>} U
	 * @param {U} fields
	 * @returns {Structure<{ [K in keyof U]: Infer<U[K]> }>}
	 */
	static object(fields) {
		const schema = {
			type: "object",
			properties: {},
			default: {},
			additionalProperties: false,
		};
		for (const [key, struct] of Object.entries(fields)) {
			schema.properties[key] = struct.schema;
		}
		return new Structure(schema, (input = {}, context = undefined) => {
			const path = context?.path ?? [];
			if (input && typeof input !== "object") {
				throw new StructError("Expected an object", path);
			}
			const output = {};
			const errors = [];
			for (const key in fields) {
				const ctx = { path: [...path, key] };
				try {
					output[key] = fields[key].process(input[key], ctx);
				} catch (error) {
					errors.push(StructError.chain(error, ctx));
				}
			}
			if (errors.length > 0) {
				throw new StructError("Object does not match schema", path, errors);
			}
			return output;
		});
	}

	/**
	 * **UNSTABLE** use at your own risk
	 *
	 * @template {Structure<any>} U
	 * @param {U} struct
	 * @returns {Structure<Array<Infer<U>>>}
	 */
	static array(struct) {
		const schema = {
			type: "array",
			items: struct.schema,
			default: [],
		};
		return new Structure(schema, (input = [], context = undefined) => {
			const path = context?.path ?? [];
			if (!Array.isArray(input)) {
				throw new StructError("Expected an array", path);
			}
			const output = [];
			const errors = [];
			for (let i = 0; i < input.length; i++) {
				const ctx = { path: [...path, `${i}`] };
				try {
					output.push(struct.process(input[i], ctx));
				} catch (error) {
					errors.push(StructError.chain(error, ctx));
				}
			}
			if (errors.length > 0) {
				throw new StructError("Array item does not match schema", path, errors);
			}
			return output;
		});
	}
}
