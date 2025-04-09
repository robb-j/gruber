import {
	assertEquals,
	assertThrows,
	describe,
	fakeTokens,
	it,
} from "./test-deps.js";
import { CompositeTokens } from "./tokens.ts";

describe("CompositeTokens", () => {
	describe("verify", () => {
		it("tries each verifier", async () => {
			const tokens = new CompositeTokens(
				{ sign: () => Promise.resolve("signed_token") },
				[
					{ verify: () => Promise.resolve(null) },
					{ verify: () => Promise.resolve(null) },
					{ verify: () => Promise.resolve({ userId: 1, scope: "statuses" }) },
					{ verify: () => Promise.resolve({ userId: 2, scope: "invalid" }) },
				],
			);

			assertEquals(await tokens.verify("input_token"), {
				userId: 1,
				scope: "statuses",
			});
		});
	});

	describe("sign", () => {
		it("uses the signer", async () => {
			const tokens = new CompositeTokens(
				{
					sign: (scope, options) =>
						Promise.resolve(`${scope}__${options.userId}`),
				},
				[],
			);

			assertEquals(await tokens.sign("statuses", { userId: 1 }), "statuses__1");
		});
	});
});
