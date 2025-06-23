import { StandardSchemaV1 } from "./standard-schema.ts";
import type { Structure } from "./structure.ts";

/** @internal */
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

	getOneLiner() {
		return (this.path.join(".") || ".") + " — " + this.message;
	}

	*[Symbol.iterator](): Iterator<_StructError> {
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
