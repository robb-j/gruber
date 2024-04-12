/**
 * @template T @param {T} fields
 * @param {(keyof T)[]} columns
 * @param {string} fallback
 */
export function formatMarkdownTable(fields, columns, fallback) {
	const widths = columns.map((column) => {
		let largest = column.length;
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

/**
 * @template {() => any} T
 * @param {T} handler
 * @returns {T}
 */
export function loader(handler) {
	/** @type {ReturnType<T> | null} */
	let result = null;
	return () => {
		if (result === null) result = handler();
		return result;
	};
}
