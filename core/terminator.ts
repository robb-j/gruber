import type { TimerService } from "./timers.ts";

/**
 * @internal
 * @group Terminator
 *
 * Options for creating a {@link Terminator} instance
 *
 * ```js
 * const options = {
 *   // How long to wait in the terminating state so loadbalancers can process it
 *   timeout: 5_000,
 *
 *   // Which OS signals to listen for
 *   signals: ['SIGINT', 'SIGTERM'],
 *
 *   // Register each signal with the OS and call the handler
 *   startListeners(signals, handler) {},
 *
 *   // Exit the process with a given code and optionaly log an error
 *   exitProcess(statusCode, error) {},
 * }
 * ```
 */
export interface TerminatorOptions {
	timeout: number;
	signals: string[];

	startListeners: (signals: string[], block: TerminatorAction) => void;
	exitProcess: (statusCode: number, error?: unknown) => void;
}

export type TerminatorState = "running" | "terminating";

export type TerminatorAction = () => unknown;

// Note: it's useful to have block in #start so that it can capture scope-level variables
// so you can declare and use the terminator globally then pass context whe you want to run it

/**
 * @internal
 * @group Terminator
 *
 * Terminators let you add graceful shutdown to your applications,
 * create one with {@link TerminatorOptions}
 *
 * ```js
 * const arnie = new Terminator({
 *   timeout: 5_000,
 *   signals: ['SIGINT', 'SIGTERM'],
 *   startListeners(signals, handler) {},
 *   exitProcess(statusCode, error) {},
 * })
 * ```
 */
export class Terminator {
	state: TerminatorState = "running";
	options: TerminatorOptions;
	timers: TimerService;

	constructor(options: TerminatorOptions, timers: TimerService) {
		this.options = options;
		this.timers = timers;
	}

	/**
	 * Start the terminator and capture a block of code to close the server
	 *
	 * ```js
	 * arnie.start(async () => {
	 *   await store.dispose()
	 * })
	 * ```
	 */
	start(block: TerminatorAction) {
		this.options.startListeners(this.options.signals, () => {
			this.terminate(block);
		});
	}

	/**
	 * @internal
	 *
	 * Start the shutdown process
	 *
	 * ```js
	 * await arnie.terminate(async () => {
	 *   await store.dispose()
	 * })
	 * ```
	 */
	async terminate(block: TerminatorAction) {
		this.state = "terminating";

		await new Promise<void>((resolve) => {
			this.timers.setTimeout(resolve, this.options.timeout);
		});

		try {
			await block();
			this.options.exitProcess(0);
		} catch (error) {
			this.options.exitProcess(1, error);
		}
	}

	/**
	 * Get a Fetch Response with the state of the terminator, probably for a load balancer.
	 *
	 * If the terminator is running, it will return a http/200
	 * otherwise it will return a http/503
	 *
	 * ```js
	 * const response = await arnie.getResponse()
	 * ```
	 */
	getResponse(): Response {
		return new Response(this.state, {
			status: this.state === "running" ? 200 : 503,
			statusText: this.state === "running" ? "OK" : "Service Unavailable",
		});
	}
}
