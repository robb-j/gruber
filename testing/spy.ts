export type Spy<T extends (...args: any) => any> = T & {
	uses: any[][];
};

export function spy<T extends (...args: any[]) => any>(impl: T): Spy<T> {
	const uses: any[][] = [];

	const apply = (...args: any[]): any => {
		uses.push(args);
		return impl(...args);
	};

	return Object.assign(apply, { uses }) as Spy<T>;
}
