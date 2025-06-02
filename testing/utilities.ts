import { fakeToken } from "./stubs.ts";

export function jsonBody(body: any, headers = {}) {
	return {
		headers: { "Content-Type": "application/json", ...headers },
		body: JSON.stringify(body),
	};
}

export function formData(values: Record<string, string | Blob>) {
	const data = new FormData();
	for (const key in values) data.set(key, values[key]);
	return data;
}

export function authorize(scope: string, userId?: number) {
	const value = fakeToken(scope, userId);
	return {
		authorization: `Bearer ${value}`,
	};
}

export type Mocking<T> = Partial<Record<keyof T, any>>;

export function mock<const T>(input: T): any {
	return new Proxy<any>(input, {
		get(target: any, prop) {
			return (
				target[prop] ??
				(() => {
					throw new Error(`Mock "${prop.toString()}" not implemented`);
				})
			);
		},
	});
}

export function mockRepo<const T>(input: T): any {
	const value = { ...input, with: () => value };
	return mock(value);
}

export function shallowEqual(a: any, b: any) {
	return (
		Object.keys(a).length === Object.keys(b).length &&
		Object.keys(a).every((key) => a[key] == b[key])
	);
}
