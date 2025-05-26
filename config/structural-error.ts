export class StructuralError extends Error {
	path: string[];
	children: StructuralError[];
	constructor(
		message: string,
		path: string[] = [],
		children: StructuralError[] = [],
	) {
		super(message);
		this.path = path;
		this.children = children;
		this.name = "StructuralError";
		Error.captureStackTrace(this, StructuralError);
	}

	static chain(error: unknown, context: { path: string[] }): StructuralError;
	static chain(error: unknown, path: string[]): StructuralError;
	static chain(
		error: unknown,
		path: string[] | { path: string[] } = [],
	): StructuralError {
		if (!Array.isArray(path)) {
			const chained = this.chain(error, path.path);
			Error.captureStackTrace(chained, StructuralError.chain);
			return chained;
		}

		let chained;
		if (error instanceof StructuralError) {
			return error;
		} else if (error instanceof Error) {
			chained = new StructuralError(error.message, path);
		} else {
			chained = new StructuralError("Unknown error", path);
		}
		Error.captureStackTrace(chained, StructuralError.chain);
		return chained;
	}

	getOneLiner() {
		return (this.path.join(".") || ".") + " — " + this.message;
	}

	*[Symbol.iterator](): Iterator<StructuralError> {
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
}

/** @deprecated use `StructuralError` */
export const StructError = StructuralError;

/** @deprecated use `StructuralError` */
export const StructureError = StructuralError;
