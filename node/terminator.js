import process from "node:process";
import { Terminator } from "../core/terminator.js";

/**
 * @typedef NodeTerminatorOptions
 * @property {number} [timeout] How long to wait in the terminating state before shutting down
 * @property {string[]} [signals] Which signals to listen for to trigger termination
 */

/**
 * @param {NodeTerminatorOptions} options
 * @returns {import("./core.js").TerminatorOptions}
 */
export function getTerminatorOptions(options) {
	return {
		timeout: options.timeout ?? 5_000,
		signals: options.signals ?? ["SIGINT", "SIGTERM"],
		startListeners(signals, block) {
			for (const signal of signals) {
				process.on(signal, () => block());
			}
		},
		exitProcess(statusCode, error) {
			if (error) {
				console.error("Failed to exit gracefully", error);
			}
			process.exit(statusCode);
		},
		wait(ms) {
			return new Promise((resolve) => setTimeout(resolve, ms));
		},
	};
}

/** @param {NodeTerminatorOptions} options */
export function getTerminator(options) {
	return new Terminator(getTerminatorOptions(options));
}
