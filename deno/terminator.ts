import { CoreTerminator } from "../core/terminator.js";

export class Terminator extends CoreTerminator {
	_startLiteners(signals: string[], block: () => unknown): void {
		for (const signal of signals) {
			Deno.addSignalListener(signal as Deno.Signal, () =>
				this.terminate(block),
			);
		}
	}

	_exitProcess(statusCode: number, error?: Error): void {
		if (error) {
			console.error("Failed to exit gracefully", error);
		}
		Deno.exit(statusCode);
	}

	_wait(ms: number): Promise<void> {
		return new Promise((r) => setTimeout(r, ms));
	}
}
