export type Dependencies = Record<string, () => unknown>;

export type UnwrapDependencies<T> = {
	[K in keyof T]: T[K] extends () => infer U ? U : T[K];
};

export type WrapDependencies<T> = {
	[K in keyof T]: () => T[K];
};

/** @unstable */
export class Container<T extends Dependencies> {
	dependencies: T;
	unwrapped = new Map<any, any>();
	overrides = new Map<any, any>();

	constructor(dependencies: T) {
		this.dependencies = dependencies;
	}

	override(values: Record<any, any>) {
		const missing = new Set(Object.keys(this.dependencies));
		for (const [key, value] of Object.entries(values)) {
			this.overrides.set(key, value);
			if (missing.has(key)) missing.delete(key);
		}
		for (const key of missing) {
			this.overrides.set(key, unmetDependency(key));
		}
	}

	reset() {
		this.overrides.clear();
	}

	get<K extends keyof T>(key: K): UnwrapDependencies<T>[K] {
		return (
			this.overrides.get(key) ?? this.unwrapped.get(key) ?? this.unwrap(key)
		);
	}

	unwrap(key: keyof T) {
		const value = this.dependencies[key]();
		this.unwrapped.set(key, value);
		return value;
	}

	/** Create a proxy around an object that injects our dependencies */
	proxy<U>(base: U): U & UnwrapDependencies<T> {
		const object = { ...base } as U & UnwrapDependencies<T>;
		for (const prop in this.dependencies) {
			Object.defineProperty(object, prop, {
				get: () => this.get(prop),
			});
		}
		return object;
	}
}

// NOTE: I'm not sure if Container should reach deeply into dependencies,
// it forces dependencies to be objects
function unmetDependency(name: string) {
	const get = (target: any, path: any) => {
		throw new Error(`Unmet dependency "${name}", tried to use "${path}"`);
	};
	return new Proxy({}, { get });
}
