import { loader } from "./utilities.ts";

/**
 * RandomService provices an abstraction around generating random values
 *
 * ```js
 * const random // RandomService
 *
 * // Pick a number between 4 & 7 inclusively
 * let number = random.number(4, 7)
 *
 * // Generate a UUID
 * let uuid = random.uuid()
 *
 * // Pick an element from an array
 * let element = random.element([1, 2, 3, 4, 5])
 * ```
 */
export interface RandomService {
	number(min: number, max: number): number;
	uuid(): string;
	element<T>(values: T[]): T;
}

/**
 * A standard implementation of `RandomService` using Math.random + crypto.randomUUID()
 *
 * ```js
 * const random = useRandom()
 * let number = random.number(4, 7)
 * let uuid = random.uuid()
 * let element = random.element([1, 2, 3, 4, 5])
 * ```
 */
export const useRandom = loader<RandomService>(() => ({
	number(min, max) {
		return min + Math.floor(Math.random() * (max - min));
	},
	uuid() {
		return crypto.randomUUID();
	},
	element<T>(values: T[]) {
		return values[Math.floor(Math.random() * values.length)];
	},
}));
