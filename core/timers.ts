/** @unstable ~ should be a subset of window */
export interface TimerService {
	setTimeout(fn: () => unknown, ms: number): number;
	clearTimeout(timerId: number): void;
}
