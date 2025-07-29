/**
 * `PostgresService` is an abstraction around a connection to a running postgres database.
 * Originally it was a shallow interface for [postgres.js](https://github.com/porsager/postgres),
 * but it is moving towards an agnostic layer that any SQL-based library could implement.
 *
 * The idea is that platforms within Gruber implement a method that returns an object that conforms to this interface
 * using a specific postgres library.
 *
 * It might be interesting to think of this as an abstraction over any SQL-based server, but for now it is focussed on postgres.
 *
 * ```js
 * const sql // PostgresService
 *
 * // Run an SQL transaction and return the response
 * const result = await sql.transaction(async (trx) => {
 *   await trx.execute` INSERT INTO ... `
 *   return trx.execute` SELECT * FROM ... `
 * })
 *
 * // Execute a statement
 * const users = await sql.execute` SELECT * FROM users WHERE id = ${5}`
 *
 * // Prepare a value to be used in a query
 * const pets = await sql.execute`
 *   SELECT * FROM pets WHERE id IN ${sql.prepare([1, 2, 3, 4])}
 * `
 *
 * // Write JSON to the database
 * await sql.execute`
 *   INSERT INTO bicycles (name, model)
 *   VALUES ("Big red", ${sql.json({ id: "xxx-yyy-zzz" })})
 * `
 *
 * // Close the connection
 * await sql.dispose()
 *
 * // Use Explicit Resource Management to automatically dispose the connection
 * function main() {
 *   using sql = getPostgresService(...)
 *
 *   await sql.execute` SELECT * FROM ... `
 * }
 * ```
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
