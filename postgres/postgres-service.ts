/**
 * `PostgresService` is an abstraction around a connection to a running postgres database.
 * Originally it was a shallow interface for [postgres.js](https://github.com/porsager/postgres),
 * but it is moving towards an agnostic layer that any SQL-based library could implement.
 *
 * The idea is that platforms within Gruber implement a method that returns an object that conforms to this interface
 * using a specific postgres library.
 *
 * It might be interesting to think of this as an abstraction over any SQL-based server, but for now it is focussed on postgres.
 */
export interface PostgresService {
	transaction<T>(block: (sql: PostgresService) => T): Promise<Awaited<T>>;

	execute<T>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;

	prepare(value: unknown): any;

	json(value: unknown): any;

	dispose(): Promise<void>;

	[Symbol.asyncDispose](): Promise<void>;

	//
	// Deprecations ~ old `SqlDependency`
	//

	/** @deprecated use {@link PostgresService.prepare} */
	(): Promise<void>;

	/** @deprecated use {@link PostgresService.execute} */
	<T = any[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;

	/** @deprecated use {@link PostgresService.transaction} */
	begin<T>(block: (sql: PostgresService) => T): Promise<Awaited<T>>;

	/** @deprecated use {@link PostgresService.dispose} */
	end(): Promise<void>;
}
