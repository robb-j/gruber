import process from "node:process";
import { CoreTerminator } from "../core/terminator.js";

export class Terminator extends CoreTerminator {
	/**
	 * @param {string[]} signals The signals to listen for
	 * @param {() => unknown)} block The code to run
	 */
	_startLiteners(signals, block) {
		for (const signal of signals) {
			process.on(signal, () => this.terminate(block));
		}
	}

	/**
	 * @param {number} statusCode The code to exit the process with
	 * @param {Error} error The error that occurred
	 */
	_exitProcess(statusCode, error = undefined) {
		if (error) {
			console.error("Failed to exit gracefully", error);
		}
		process.exit(statusCode);
	}

	/**
	 * @param {number} ms
	 * @returns {Promise<void>}
	 */
	_wait(ms) {
		return new Promise((r) => setTimeout(r, ms));
	}
}
