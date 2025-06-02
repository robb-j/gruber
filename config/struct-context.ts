import { PromiseList } from "../core/mod.ts";

export type StructContext =
	| { type: "sync"; path: string[] }
	| { type: "async"; path: string[]; promises: PromiseList };

export const DEFAULT_CONTEXT: StructContext = { type: "sync", path: [] };

export function _nestContext(input: StructContext, key: string): StructContext {
	return { ...input, path: input.path.concat(key) };
}
