/**
 * @ignore
 * A utility type for defining a record of dependency-factories
 */
export type Dependencies = Record<string, () => unknown>;

/**
 * @ignore
 * A utility type for converting a record of dependency-factories to dependencies
 */
export type UnwrapDependencies<T> = {
	[K in keyof T]: T[K] extends () => infer U ? U : T[K];
};

/**
 * @ignore
 * A utility type to convert dependencies back into dependency-factories
 */
export type WrapDependencies<T> = {
	[K in keyof T]: () => T[K];
};

/**
 * @unstable
 *
 * Container holds a set of dependencies that are lazily computed
 * and provides a system to override those dependencies during testing
 *
 * ```js
 * const container = new Container({
 *   message: () => 'hello there',
 *   store: useStore
 * })
 *
 * // Retrieve a dependency
 * console.log(container.get('message')) // outputs "hello there"
 *
 * // Override dependencies
 * container.override({
 *   store: new MemoryStore()
 * })
 *
 * // get the overridden store
 * let store = container.get('store') // MemoryStore
 *
 * // attempt to get the message
 * container.get('message') // throws Error('unmet dependency')
 *
 * // restore the container back to the original dependencies
 * container.reset()
 * ```
 */
export class Container<T extends Dependencies> {
	dependencies: T;
	unwrapped = new Map<any, any>();
	overrides = new Map<any, any>();

	constructor(dependencies: T) {
		this.dependencies = dependencies;
	}

	/**
	 * Override the dependencies within the container or create unmet dependencies for those not-provided
	 *
	 * ```js
	 * // Replace the store with an in-memory one
	 * container.override({ store: new MemoryStore() })
	 * ```
	 */
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

	/**
	 * Clear any overrides on the dependencies
	 *
	 * ```js
	 * container.reset()
	 * ```
	 */
	reset() {
		this.overrides.clear();
	}

	/**
	 * Get a dependency. First checking overrides, then previously computed or finaly use the dependency factory
	 */
	get<K extends keyof T>(key: K): UnwrapDependencies<T>[K] {
		return (
			this.overrides.get(key) ?? this.unwrapped.get(key) ?? this.unwrap(key)
		);
	}

	/**
	 * @internal
	 *
	 * Compute a dependency from it's factory
	 *
	 * ```js
	 * const message = container.unwrap('message')
	 * ```
	 */
	unwrap(key: keyof T) {
		const value = this.dependencies[key]();
		this.unwrapped.set(key, value);
		return value;
	}

	/**
	 * Create a proxy around an object that injects our dependencies
	 *
	 * ```ts
	 * const container = new Container({ message: () => 'hello there' })
	 *
	 * const proxy = container.proxy({ count: 7 })
	 * proxy.message // 'hello there'
	 * proxy.count // 7
	 *
	 * // or with object destructuring
	 * const { message, count } = container.proxy({ count: 7 })
	 * ```
	 */
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
