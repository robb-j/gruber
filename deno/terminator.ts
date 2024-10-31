import { Terminator, TerminatorOptions } from "../core/terminator.ts";

export interface DenoTerminatorOptions {
	timeout?: number;
	signals?: Deno.Signal[];
}

export function getTerminatorOptions(
	options: DenoTerminatorOptions,
): TerminatorOptions {
	return {
		timeout: options.timeout ?? 5_000,
		signals: options.signals ?? ["SIGINT", "SIGTERM"],
		startListeners(signals, block) {
			for (const signal of signals) {
				Deno.addSignalListener(signal as Deno.Signal, () => block());
			}
		},
		exitProcess(statusCode, error) {
			if (error) {
				console.error("Failed to exit gracefully", error);
			}
			Deno.exit(statusCode);
		},
		wait(ms) {
			return new Promise((resolve) => setTimeout(resolve, ms));
		},
	};
}

export function getTerminator(options: DenoTerminatorOptions = {}) {
	return new Terminator(getTerminatorOptions(options));
}
