import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Terminator, type TerminatorOptions } from "./terminator.ts";
import type { TimerService } from "./timers.ts";

class MockTerminator extends Terminator {
	mock;
	constructor(options: Partial<TerminatorOptions> = {}) {
		const mock: any = {};
		options.startListeners = (signals, block) => {
			mock.listening = { signals, block };
		};
		options.exitProcess = (statusCode, error) => {
			mock.exited = { statusCode, error };
		};
		const timers = {
			setTimeout(block, ms) {
				mock.waited = { ms };
				block();
			},
		} as TimerService;

		super(options as any, timers);
		this.mock = mock;
	}
}

describe("Terminator", () => {
	describe("constructor", () => {
		it("sets the state", () => {
			const arnie = new MockTerminator({});
			assert.equal(arnie.state, "running");
		});
		it("stores options", () => {
			const options = {
				signals: ["signal-a", "signal-b"],
				timeout: 3_000,
				startListeners() {},
				exitProcess() {},
			};
			const arnie = new MockTerminator(options);
			assert.deepEqual(arnie.options, options);
		});
	});

	describe("start", () => {
		it("starts listeners", () => {
			const arnie = new MockTerminator({
				signals: ["signal-a", "signal-b"],
			});
			const blockSpy = () => {};

			arnie.start(blockSpy);

			assert.deepEqual(
				arnie.mock.listening.signals,
				["signal-a", "signal-b"],
				"should call _startListeners with the block",
			);
		});
	});

	describe("terminate", () => {
		it("sets the state", async () => {
			const arnie = new MockTerminator();
			await arnie.terminate(() => {});
			assert.equal(arnie.state, "terminating");
		});
		it("waits", async () => {
			const arnie = new MockTerminator({ timeout: 1234 });
			await arnie.terminate(() => {});
			assert.deepEqual(
				arnie.mock.waited,
				{ ms: 1234 },
				"should wait for the timeout",
			);
		});
		it("runs the block", async () => {
			const arnie = new MockTerminator();
			let ran = false;
			await arnie.terminate(() => (ran = true));
			assert.equal(ran, true, "should run the original block");
		});
		it("runs the block async", async () => {
			const arnie = new MockTerminator();
			let ran = false;
			await arnie.terminate(() => Promise.resolve().then(() => (ran = true)));
			assert.equal(ran, true, "should run the original block");
		});
		it("exits", async () => {
			const arnie = new MockTerminator();
			await arnie.terminate(() => {});
			assert.equal(arnie.mock.exited.statusCode, 0);
		});
		it("handles errors", async () => {
			const arnie = new MockTerminator();
			const error = new Error();
			await arnie.terminate(() => {
				throw error;
			});
			assert.deepEqual(
				arnie.mock.exited,
				{ statusCode: 1, error },
				"should indicate the process ended badly",
			);
		});
	});

	describe("getResponse", () => {
		it("returns a 200 when running", async () => {
			const arnie = new MockTerminator();
			const response = arnie.getResponse();

			assert.equal(response.status, 200);
			assert.equal(response.statusText, "OK");
			assert.equal(await response.text(), "running");
		});
		it("returns a 503 when terminating", async () => {
			const arnie = new MockTerminator();
			await arnie.terminate(() => {});
			const response = arnie.getResponse();

			assert.equal(response.status, 503);
			assert.equal(response.statusText, "Service Unavailable");
			assert.equal(await response.text(), "terminating");
		});
	});
});
