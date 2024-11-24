import { Terminator } from "./terminator.ts";
import { assertEquals, assertThrows, describe, it } from "./test-deps.js";

class MockTerminator extends Terminator {
	constructor(options) {
		const mock = {};
		super({
			startListeners(signals, block) {
				mock.listening = { signals, block };
			},
			exitProcess(statusCode, error) {
				mock.exited = { statusCode, error };
			},
			wait(ms) {
				mock.waited = { ms };
			},
			...options,
		});
		this.mock = mock;
	}
}

describe("Terminator", () => {
	describe("constructor", () => {
		it("sets the state", () => {
			const arnie = new Terminator({});
			assertEquals(arnie.state, "running");
		});
		it("stores options", () => {
			const options = {
				signals: ["signal-a", "signal-b"],
				timeout: 3_000,
				startListeners() {},
				exitProcess() {},
				wait() {},
			};
			const arnie = new Terminator(options);
			assertEquals(arnie.options, options);
		});
	});

	describe("start", () => {
		it("starts listeners", () => {
			const arnie = new MockTerminator({
				signals: ["signal-a", "signal-b"],
			});
			const blockSpy = () => {};

			arnie.start(blockSpy);

			assertEquals(
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
			assertEquals(arnie.state, "terminating");
		});
		it("waits", async () => {
			const arnie = new MockTerminator({ timeout: 1234 });
			await arnie.terminate(() => {});
			assertEquals(
				arnie.mock.waited,
				{ ms: 1234 },
				"should wait for the timeout",
			);
		});
		it("runs the block", async () => {
			const arnie = new MockTerminator();
			let ran = false;
			await arnie.terminate(() => (ran = true));
			assertEquals(ran, true, "should run the original block");
		});
		it("runs the block async", async () => {
			const arnie = new MockTerminator();
			let ran = false;
			await arnie.terminate(() => Promise.resolve().then(() => (ran = true)));
			assertEquals(ran, true, "should run the original block");
		});
		it("exits", async () => {
			const arnie = new MockTerminator();
			await arnie.terminate(() => {});
			assertEquals(arnie.mock.exited.statusCode, 0);
		});
		it("handles errors", async () => {
			const arnie = new MockTerminator();
			const error = new Error();
			await arnie.terminate(() => {
				throw error;
			});
			assertEquals(
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

			assertEquals(response.status, 200);
			assertEquals(response.statusText, "OK");
			assertEquals(await response.text(), "running");
		});
		it("returns a 503 when terminating", async () => {
			const arnie = new MockTerminator();
			await arnie.terminate(() => {});
			const response = arnie.getResponse();

			assertEquals(response.status, 503);
			assertEquals(response.statusText, "Service Unavailable");
			assertEquals(await response.text(), "terminating");
		});
	});
});
