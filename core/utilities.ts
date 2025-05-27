export function formatMarkdownTable<T extends Record<string, string>>(
	fields: T[],
	columns: (keyof T)[],
	fallback: string,
) {
	const widths = columns.map((column) => {
		let largest = (column as string).length;
		for (const field of fields) {
			if (field[column] && field[column].length > largest) {
				largest = field[column].length;
			}
		}
		return largest;
	});

	const lines = [
		// Header
		"| " +
			columns.map((n, i) => n.toString().padEnd(widths[i]), " ").join(" | ") +
			" |",

		// Seperator
		"| " + columns.map((_, i) => "-".padEnd(widths[i], "-")).join(" | ") + " |",

		// Values
		...fields.map(
			(field) =>
				"| " +
				columns
					.map((n, i) =>
						(field[n] ?? fallback).toString().padEnd(widths[i], " "),
					)
					.join(" | ") +
				" |",
		),
	];
	return lines.join("\n");
}

export function loader<T>(factory: () => T): () => T {
	let result: T | null = null;
	return () => {
		if (result === null) result = factory();
		return result;
	};
}

export function trimIndentation(
	input: string | TemplateStringsArray,
	...args: unknown[]
): string {
	if (typeof input !== "string") {
		return trimIndentation(reconstructTemplateString(input, ...args));
	}

	const lines = input.split(/\r?\n/);

	let n = input.length;

	for (const line of lines) {
		if (!line.trim()) continue;
		const match = line.match(/^(\s+)/);
		if (match && match[1].length < n) n = match[1].length;
	}

	if (n === input.length) return input;

	const regex = new RegExp("^\\s{" + n + "}");

	return lines
		.map((line) => line.replace(regex, ""))
		.join("\n")
		.trim();
}

export function reconstructTemplateString(
	input: string | TemplateStringsArray,
	...args: unknown[]
): string {
	let output = "";
	for (let i = 0; i < input.length; i++) {
		output += input[i];
		if (i < args.length) output += args[i];
	}
	return output;
}

// A dynamic list of promises that are automatically removed when they resolve
export class PromiseList {
	#promises: Promise<unknown>[] = [];

	push(fn: () => Promise<void>) {
		const prom = fn().then(() => {
			this.#promises = this.#promises.filter((p) => p !== prom);
		});
		this.#promises.push(prom);
	}

	async all() {
		while (this.#promises.length > 0) {
			await Promise.all(this.#promises);
		}
	}
}
