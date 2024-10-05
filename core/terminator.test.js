import { CoreTerminator } from "./terminator.js";
import { assertEquals, assertThrows, describe, it } from "./test-deps.js";

class MockTerminator extends CoreTerminator {
	_startLiteners(signals, block) {
		this.mockListening = { signals, block };
	}
	_exitProcess(statusCode, error) {
		this.mockExited = { statusCode, error };
	}
	_wait(ms) {
		this.mockWaited = ms;
	}
}

describe("CoreTerminator", () => {
	describe("constructor", () => {
		it("sets the state", () => {
			const arnie = new CoreTerminator();
			assertEquals(arnie.state, "running");
		});
		it("stores options", () => {
			const arnie = new CoreTerminator({
				timeout: 1234,
				signals: ["first", "second"],
			});
			assertEquals(arnie.options, {
				timeout: 1234,
				signals: ["first", "second"],
			});
		});
	});

	describe("start", () => {
		it("starts listeners", () => {
			const arnie = new MockTerminator({
				signals: ["signal-a", "signal-b"],
			});
			const spy = () => {};

			arnie.start(spy);

			assertEquals(
				arnie.mockListening,
				{
					signals: ["signal-a", "signal-b"],
					block: spy,
				},
				"should call _startListeners with the block",
			);
		});
	});

	describe("_startLiteners", () => {
		it("throws", () => {
			const arnie = new CoreTerminator();
			assertThrows(() => arnie._startLiteners());
		});
	});

	describe("_exitProcess", () => {
		it("throws", () => {
			const arnie = new CoreTerminator();
			assertThrows(() => arnie._exitProcess());
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
			assertEquals(arnie.mockWaited, 1234, "should wait for the timeout");
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
			assertEquals(arnie.mockExited.statusCode, 0);
		});
		it("handles errors", async () => {
			const arnie = new MockTerminator();
			const error = new Error();
			await arnie.terminate(() => {
				throw error;
			});
			assertEquals(
				arnie.mockExited,
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
