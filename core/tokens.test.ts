import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CompositeTokens } from "./tokens.ts";

describe("CompositeTokens", () => {
	describe("verify", () => {
		it("tries each verifier", async () => {
			const tokens = new CompositeTokens(
				{
					sign: () => Promise.resolve("signed_token"),
					verify: () => Promise.reject("not implemented"),
				},
				[
					{ verify: () => Promise.resolve(null) },
					{ verify: () => Promise.resolve(null) },
					{ verify: () => Promise.resolve({ userId: 1, scope: "statuses" }) },
					{ verify: () => Promise.resolve({ userId: 2, scope: "invalid" }) },
				] as any,
			);

			assert.deepEqual(await tokens.verify("input_token"), {
				userId: 1,
				scope: "statuses",
			});
		});
	});

	describe("sign", () => {
		it("uses the signer", async () => {
			const tokens = new CompositeTokens(
				{
					async sign(scope, options) {
						return `${scope}__${options?.userId}`;
					},
					verify() {
						throw new TypeError("not implemented");
					},
				},
				[],
			);

			assert.deepEqual(
				await tokens.sign("statuses", { userId: 1 }),
				"statuses__1",
			);
		});
	});
});
