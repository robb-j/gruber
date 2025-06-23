export type MaybePromise<T> = T | Promise<T>;

export interface SqlDependency {
	begin<T>(block: (sql: SqlDependency) => T): Promise<Awaited<T>>;

	/** Run an SQL query from a template string with auto-escaped arguments */
	<T = any[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;

	/** Convert a value into a Postgres helper */
	(value: unknown): any;

	/** Prepare JSON for a query */
	json(value: unknown): any;

	/** end the connection */
	end(): Promise<void>;
}

export interface _SignJWT {
	new (payload: any): _SignJWT;

	setProtectedHeader(header: { alg: string; typ: string }): _SignJWT;
	setIssuedAt(): _SignJWT;
	setIssuer(issuer: string): _SignJWT;
	setAudience(audience: string): _SignJWT;
	setSubject(subject: string): _SignJWT;
	setExpirationTime(expiration: number | Date): _SignJWT;

	sign(secret: Uint8Array): Promise<string>;
}

export interface JoseDependency {
	jwtVerify(
		jwt: string,
		key: Uint8Array,
		options?: { issuer?: string; audience?: string },
	): Promise<{ payload: any }>;

	SignJWT: _SignJWT;
}

export interface RedisDependency {
	get(key: string): Promise<string | undefined>;
	set(key: string, value: string, options?: { PX?: number }): Promise<unknown>;
	del(key: string): Promise<unknown>;
}
