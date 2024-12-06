import process from "node:process";
import { Terminator, TerminatorOptions } from "../core/terminator.ts";

export interface NodeTerminatorOptions {
	timeout?: number;
	signals?: string[];
}

export function getTerminatorOptions(
	options: NodeTerminatorOptions,
): TerminatorOptions {
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
	};
}

export function getTerminator(options: NodeTerminatorOptions = {}): Terminator {
	return new Terminator(getTerminatorOptions(options), globalThis);
}
