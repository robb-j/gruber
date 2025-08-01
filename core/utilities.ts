/**
 * Given a set of `records` with known `columns`, format them into a pretty markdown table using the order from `columns`.
 * If a record does not have a specified value (it is null or undefined) it will be replaced with the `fallback` value.
 *
 * ```js
 *	const table = formatMarkdownTable(
 *		[
 *			{ name: 'Geoff Testington', age: 42 },
 *			{ name: "Jess Smith", age: 32 },
 *			{ name: "Tyler Rockwell" },
 *		],
 *		['name', 'age'],
 *		'~'
 *	)
 *	```
 *
 *	Which will generate:
 *
 *	```
 *	| name             | age |
 *	| ---------------- | --- |
 *	| Geoff Testington | 42  |
 *	| Jess Smith       | 32  |
 *	| Tyler Rockwell   | ~   |
 *	```
 */
export function formatMarkdownTable<T extends Record<string, string>>(
	records: T[],
	columns: (keyof T)[],
	fallback: string,
) {
	const widths = columns.map((column) => {
		let largest = (column as string).length;
		for (const field of records) {
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
		...records.map(
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
 * @unstable
 *
 * `loader` let's you memoize the result of a function to create a singleton from it.
 * It works synchronously or with promises.
 *
 * ```js
 * let index = 1
 * const useMessage = loader(() = 'hello there ${i++}')
 *
 * useMessage() // hello there 1
 * useMessage() // hello there 1
 * useMessage() // hello there 1
 * ```
 */
export function loader<T>(factory: () => T): () => T {
	let result: T | null = null;
	return () => {
		if (result === null) result = factory();
		return result;
	};
}

/**

`trimIndentation` takes a template literal (with values) and takes out the common whitespace.
Very heavily based on [dedent](https://github.com/dmnd/dedent/tree/main)

```js
import { trimIndentation } from "gruber";

console.log(
	trimIndentation`
		Hello there!
		My name is Geoff
	`,
);
```

Which will output this, without any extra whitespace:

```
Hello there!
My name is Geoff
```

*/
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

/**
@internal

A dynamic list of promises that are automatically removed when they resolve

```js
const list = new PromiseList()

// Add a promise that waits for 5 seconds
list.push(async () => {
	await new Promise(r => setTimeout(r, 5_000))

	// Add dependant promises too
	list.push(async () => {
		await somethingElse()
	})
})

// Wait for all promises and dependants to resolve in one go
await promises.all()

```
*/
export class PromiseList {
	#promises: Promise<unknown>[] = [];

	/**
	 * Add a promise to the list using a factory method,
	 * the `factory` just needs to return a promise
	 *
	 * ```js
	 * list.push(async () => {
	 *   // ...
	 * })
	 * ```
	 */
	push(fn: () => Promise<void>) {
		const prom = fn().then(() => {
			this.#promises = this.#promises.filter((p) => p !== prom);
		});
		this.#promises.push(prom);
	}

	/**
	 * Wait for all promises to be resolved using `Promise.all`.
	 * If new promises are added as a result of waiting, they are also awaited.
	 *
	 * ```js
	 * await list.all()
	 * ```
	 */
	async all() {
		while (this.#promises.length > 0) {
			await Promise.all(this.#promises);
		}
	}

	/**
	 * Get the current number of promises in the list
	 *
	 * ```js
	 * list.length // 5
	 * ```
	 */
	get length() {
		return this.#promises.length;
	}
}
