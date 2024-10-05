/**
 * @typedef TerminatorOptions
 * @property {number} [timeout] How long to wait in the terminating state before shutting down
 * @property {string[]} [signals] Which signals to listen for to trigger termination
 */

// Note: it's useful to have block in #start so that it can capture scope-level variables

/** @unstable */
export class CoreTerminator {
	/** @type {'running' | 'terminating'} */
	state = "running";

	/** @type {Required<TerminatorOptions>} */
	options;

	/** @param {TerminatorOptions} options */
	constructor(options = {}) {
		this.options = {
			timeout: options.timeout ?? 5_000,
			signals: options.signals ?? ["SIGINT", "SIGTERM"],
		};
	}

	/** @param {() => unknown)} block */
	start(block) {
		this._startLiteners(this.options.signals, block);
	}

	/**
	 * @param {string[]} signals
	 * @param {() => void)} block
	 */
	_startLiteners(signals, block) {
		throw new Error("Not implemented - do not use CoreTerminator directly");
	}

	/**
	 * @param {number} statusCode
	 * @param {Error} error
	 */
	_exitProcess(statusCode, error) {
		throw new Error("Not implemented - do not use CoreTerminator directly");
	}

	/**
	 * @param {number} ms
	 * @returns {Promise<void>}
	 */
	_wait(ms) {
		throw new Error("Not implemented - do not use CoreTerminator directly");
	}

	/** @param {() => unknown)} block */
	async terminate(block) {
		this.state = "terminating";

		await this._wait(this.options.timeout);

		try {
			await block();
			this._exitProcess(0);
		} catch (error) {
			this._exitProcess(1, error);
		}
	}

	getResponse() {
		return new Response(this.state, {
			status: this.state === "running" ? 200 : 503,
			statusText: this.state === "running" ? "OK" : "Service Unavailable",
		});
	}
}
