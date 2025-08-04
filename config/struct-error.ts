import type { StandardSchemaV1 } from "./standard-schema.ts";
import type { Structure } from "./structure.ts";

/**
 * @name Structure.Error
 * @group Structure
 *
 * An error produced from processing a value for a {@link Structure}
 *
 * ```js
 * const error = new Structure.Error("Expected something", ["some", "path"])
 * ```
 *
 * It takes a `message`, `path` & `children` in the constructor.
 *
 * You can also iterate over a Structure.Error to walk the tree of errors.
 *
 * ```js
 * for (const error2 of error) {
 *   console.log(error2.getOneLiner())
 * }
 * ```
 */
export class _StructError extends Error {
	path: string[];
	children: _StructError[];
	constructor(
		message: string,
		path: string[] = [],
		children: _StructError[] = [],
	) {
		super(message);
		this.path = path;
		this.children = children;
		this.name = "Structure.Error";
		Error.captureStackTrace(this, _StructError);
	}

	/**
	 * @internal
	 *
	 * Create a new error with the context added to it
	 *
	 * ```js
	 * const nested = Structure.Error.chain(
	 * 	new Error("Something went wrong"),
	 * 	["some", "path"]
	 * )
	 * ```
	 */
	static chain(error: unknown, context: { path: string[] }): _StructError;
	static chain(error: unknown, path: string[]): _StructError;
	static chain(
		error: unknown,
		path: string[] | { path: string[] } = [],
	): _StructError {
		if (!Array.isArray(path)) {
			const chained = this.chain(error, path.path);
			Error.captureStackTrace(chained, _StructError.chain);
			return chained;
		}

		let chained;
		if (error instanceof _StructError) {
			// If a StructError is thrown, trust it
			return error;
		} else if (error instanceof Error) {
			chained = new _StructError(error.message, path);
		} else {
			chained = new _StructError("Unknown error", path);
		}
		Error.captureStackTrace(chained, _StructError.chain);
		return chained;
	}

	/**
	 * Get a single-line variant, describing the error
	 *
	 * ```js
	 * error.getOneLiner()
	 * ```
	 *
	 * which outputs something like:
	 *
	 * ```
	 * some.path — expected a number
	 * ```
	 */
	getOneLiner() {
		return (this.path.join(".") || ".") + " — " + this.message;
	}

	/**
	 * Loop through child errors including the error itself
	 */
	*[Symbol.iterator](): Iterator<_StructError> {
		if (this.children.length === 0) {
			yield this;
		} else {
			for (const child of this.children) {
				yield* child;
			}
		}
	}

	/**
	 * Generate a human-friendly string describing the error and all nested errors
	 *
	 * ```js
	 * error.toFriendlyString()
	 * ```
	 *
	 * which outputs something like:
	 *
	 * ```
	 * Object does not match schema
	 *   name — expected a string
	 *   age — expected a number
	 * ```
	 */
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

	/**
	 * Convert the error to a [StandardSchema](https://standardschema.dev/) issue to be used with that ecosystem.
	 */
	getStandardSchemaIssues(): StandardSchemaV1.Issue[] {
		let issues: StandardSchemaV1.Issue[] = [
			{ message: this.message, path: this.path },
		];
		for (const child of this.children) {
			issues = issues.concat(child.getStandardSchemaIssues());
		}
		return issues;
	}
}

/** @deprecated use {@link Structure.Error} */
export const StructError = _StructError;

/** @deprecated use {@link Structure.Error} */
export type StructError = _StructError;

/** @deprecated use {@link Structure.Error} */
export const StructureError = _StructError;

/** @deprecated use {@link Structure.Error} */
export const StructuralError = _StructError;

/** @deprecated use {@link Structure.Error} */
export type StructuralError = _StructError;
