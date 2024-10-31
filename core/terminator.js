/**
 * @typedef TerminatorOptions
 * @property {number} timeout
 * @property {string[]} signals
 *
 * @property {(signals: string[], block: () => unknown) => void} startListeners
 * @property {(statusCode: number, error?: Error) => void} exitProcess
 * @property {(ms: number) => Promise<void>} wait
 */

// Note: it's useful to have block in #start so that it can capture scope-level variables

/** @unstable */
export class Terminator {
	/** @type {'running' | 'terminating'} */
	state = "running";

	/** @type {TerminatorOptions} */
	options;

	/** @param {TerminatorOptions} options */
	constructor(options = {}) {
		this.options = options;
	}

	/** @param {() => unknown)} block */
	start(block) {
		this.options.startListeners(() => {
			this.terminate(block);
		});
	}

	/** @param {() => unknown)} block */
	async terminate(block) {
		this.state = "terminating";

		await this.options.wait(this.options.timeout);

		try {
			await block();
			this.options.exitProcess(0);
		} catch (error) {
			this.options.exitProcess(1, error);
		}
	}

	getResponse() {
		return new Response(this.state, {
			status: this.state === "running" ? 200 : 503,
			statusText: this.state === "running" ? "OK" : "Service Unavailable",
		});
	}
}
