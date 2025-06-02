import { TimerService } from "./timers.ts";

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

/** @unstable */
export class Terminator {
	state: TerminatorState = "running";
	options: TerminatorOptions;
	timers: TimerService;
	// #stack: AsyncDisposable[] = []; // NOTE: DisposableStack isn't ready yet
	// ac = new AbortController();

	constructor(options: TerminatorOptions, timers: TimerService) {
		this.options = options;
		this.timers = timers;
	}

	// get signal() {
	// 	return this.ac.signal;
	// }

	start(block: TerminatorAction) {
		this.options.startListeners(this.options.signals, () => {
			this.terminate(block);
		});
	}

	async terminate(block: TerminatorAction) {
		this.state = "terminating";

		await new Promise<void>((resolve) => {
			this.timers.setTimeout(resolve, this.options.timeout);
		});

		try {
			await block();
			// for (const d of this.#stack.reverse()) await d[Symbol.asyncDispose]();
			// this.ac.abort();
			this.options.exitProcess(0);
		} catch (error) {
			this.options.exitProcess(1, error);
		}
	}

	// /** @unstable very */
	// _enqueue(value: AsyncDisposable) {
	// 	this.#stack.push(value);
	// }

	getResponse(): Response {
		return new Response(this.state, {
			status: this.state === "running" ? 200 : 503,
			statusText: this.state === "running" ? "OK" : "Service Unavailable",
		});
	}
}
