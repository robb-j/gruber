import type { ConfigurationOptions } from "./configuration.ts";
import type { PrimativeOptions } from "./specifications.ts";

/**
 * @ignore
 *
 * A matched value of a configuration value and the source it came from
 */
export type ConfigurationResult =
	| { source: "argument"; value: unknown }
	| { source: "variable"; value: unknown }
	| { source: "current"; value: unknown }
	| { source: "fallback"; value: unknown };

/**
 * Parse a JavaScript primative like a string, number or boolean,
 * applying the precedence of argument > variable > file > fallback
 */
export function _parsePrimative<T>(
	config: ConfigurationOptions,
	options: PrimativeOptions<T>,
	currentValue: unknown,
): ConfigurationResult {
	const argument = options.flag
		? config.getCommandArgument(options.flag)
		: undefined;
	if (argument !== undefined) return { source: "argument", value: argument };

	const variable = options.variable
		? config.getEnvironmentVariable(options.variable)
		: undefined;
	if (variable !== undefined) return { source: "variable", value: variable };

	if (currentValue !== undefined) {
		return { source: "current", value: currentValue };
	}

	return { source: "fallback", value: options.fallback };
}

/**
 * Parse a floating-point number from a configuration result,
 * attempting to coerce string values.
 */
export function _parseFloat(result: ConfigurationResult): number {
	if (typeof result.value === "string") {
		const parsed = Number.parseFloat(result.value);
		if (Number.isNaN(parsed)) {
			throw TypeError(`invalid number: ${result.value}`);
		}
		return parsed;
	}
	if (typeof result.value === "number") {
		return result.value;
	}
	throw new TypeError("Unknown float result");
}

const _booleans: Record<string, boolean | undefined> = {
	1: true,
	true: true,
	yes: true,
	0: false,
	false: false,
	no: false,
};

/**
 * Parse a boolean from a configuration result, coercing common string values
 */
export function _parseBoolean(result: ConfigurationResult): boolean {
	if (typeof result.value === "boolean") return result.value;

	if (
		typeof result.value === "string" &&
		typeof _booleans[result.value] === "boolean"
	) {
		return _booleans[result.value]!;
	}
	if (result.source === "argument" && result.value === "") {
		return true;
	}
	throw new TypeError("Unknown boolean result");
}

/**
 * Parse a URL from a configuration result and create a `URL` from it
 */
export function _parseURL(result: ConfigurationResult): URL {
	if (result.value instanceof URL) return result.value;
	if (typeof result.value === "string") return new URL(result.value);
	throw new TypeError("Unknown url result");
}
