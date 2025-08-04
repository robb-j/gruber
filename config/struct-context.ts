import { PromiseList } from "../core/mod.ts";

/**
 * @ignore
 *
 * The context for processing a value for a {@link Structure}
 */
export type StructContext =
	| { type: "sync"; path: string[] }
	| { type: "async"; path: string[]; promises: PromiseList };

/**
 * @ignore
 *
 * Create a new {@link StructContext} as a child of an existing context, under a key.
 * For example when nesting a field while already processing an object
 */
export function _nestContext(input: StructContext, key: string): StructContext {
	return { ...input, path: input.path.concat(key) };
}
