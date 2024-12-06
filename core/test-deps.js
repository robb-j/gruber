export * from "https://deno.land/std@0.211.0/assert/mod.ts";
export * from "https://deno.land/std@0.211.0/testing/bdd.ts";

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
