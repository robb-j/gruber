export * from "jsr:@std/assert@^1.0.15";
export * from "jsr:@std/testing@^1.0.16/bdd";
export { z as zod } from "npm:zod@^3.25.67";
export * as valibot from "jsr:@valibot/valibot@^1.1.0";
export * as ark from "npm:arktype@^2.1.20";

/** @returns {import("./random.ts").RandomService} */
export function fakeRandom() {
	return {
		uuid: () => "abcdef",
		number: () => 123456,
	};
}

/** @returns {import("./timers.ts").TimerService} */
export function fakeTimers() {
	let counter = 1;
	let timers = [];
	return {
		timers,
		// async executeAll() {
		// 	await Promise.all(timers.map((t) => t.fn));
		// 	timers = [];
		// },
		setTimeout(fn, ms) {
			let id = counter++;
			timers.push({ fn, ms, id });
			return id;
		},
		clearTimeout(id) {
			timers = timers.filter((t) => t.id !== id);
		},
	};
}

/** @returns {import("./tokens.ts").TokenService} */
export function fakeTokens() {
	return {
		sign(scope, options) {
			return JSON.stringify({ scope, ...options });
		},
		verify(token) {
			return JSON.parse(token);
		},
	};
}
