import { loader } from "./utilities.ts";

export interface RandomService {
	number(min: number, max: number): number;
	uuid(): string;
	element<T>(values: T[]): T;
}

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
