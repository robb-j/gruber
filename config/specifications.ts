import { Configuration } from "./configuration.ts";
import { Structure } from "./structure.ts";

export interface ConfigurationDescription {
	fallback: unknown;
	fields: Record<string, string>[];
}

export interface ConfigurationSpecification {
	(property: string): ConfigurationDescription;
}

export function getSpecification(
	value: any,
): ConfigurationSpecification | undefined {
	return typeof value[Configuration.spec] === "function"
		? value[Configuration.spec]
		: undefined;
}

export function objectSpec(
	options: Record<string, Structure<unknown>>,
): ConfigurationSpecification {
	return (property: string) => {
		const fallback: Record<string, unknown> = {};
		const fields: Record<string, string>[] = [];
		for (const [key, struct] of Object.entries(options)) {
			const childName = (property ? property + "." : "") + key;
			const childSpec = getSpecification(struct)?.(childName);

			if (childSpec) {
				fallback[key] = childSpec.fallback;
				fields.push(...childSpec.fields);
			}
		}
		return { fallback, fields };
	};
}

export function arraySpec(
	options: Structure<unknown>,
): ConfigurationSpecification {
	return (property: string) => {
		const childName = !property ? "[]" : property + "[]";
		const childSpec = getSpecification(options)?.(childName);
		if (!childSpec) return { fallback: [], fields: [] };

		return {
			fallback: [],
			fields: childSpec.fields,
		};
	};
}

export interface PrimativeOptions<T = any> {
	variable?: string;
	flag?: string;
	fallback: T;
}

export function primativeSpec(type: string, options: PrimativeOptions) {
	return (property: string) => ({
		fallback: options.fallback,
		fields: [
			{
				...options,
				name: property,
				type: type,
				fallback: options.fallback?.toString(),
			},
		],
	});
}
