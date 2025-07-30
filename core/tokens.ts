import type { JoseDependency } from "./types.ts";

/**
 * @unstable
 * @group Tokens
 */
export interface AuthzToken {
	userId?: number;
	scope: string;
}

/**
 * @unstable
 * @group Tokens
 */
export interface SignTokenOptions {
	userId?: number;
	/** milliseconds */ maxAge?: number;
}

/**
 * @unstable
 * @group Tokens
 *
 * A service for signing and verifying access tokens
 */
export interface TokenService {
	verify(token: string): Promise<AuthzToken | null>;
	sign(scope: string, options?: SignTokenOptions): Promise<string>;
}

/**
 * @unstable
 * @group Tokens
 */
export interface JoseTokensOptions {
	secret: string;
	issuer: string;
	audience: string;
}

/**
 * @unstable
 * @group Tokens
 */
export class JoseTokens implements TokenService {
	options: JoseTokensOptions;
	jose: JoseDependency;
	#secret: Uint8Array;

	constructor(options: JoseTokensOptions, jose: JoseDependency) {
		this.options = options;
		this.jose = jose;
		this.#secret = new TextEncoder().encode(options.secret);
	}

	async verify(input: string): Promise<AuthzToken | null> {
		try {
			const token = await this.jose.jwtVerify(input, this.#secret, {
				issuer: this.options.issuer,
				audience: this.options.audience,
			});
			return {
				userId: token.payload.sub ? parseInt(token.payload.sub) : undefined,
				scope: token.payload.scope as string,
			};
		} catch (error) {
			return null;
		}
	}

	sign(scope: string, options: SignTokenOptions = {}) {
		const jwt = new this.jose.SignJWT({ scope })
			.setProtectedHeader({ alg: "HS256", typ: "JWT" })
			.setIssuedAt()
			.setIssuer(this.options.issuer)
			.setAudience(this.options.audience);

		if (options.userId !== undefined) {
			jwt.setSubject(options.userId.toString());
		}
		if (options.maxAge !== undefined) {
			jwt.setExpirationTime((Date.now() + options.maxAge) / 1_000);
		}

		return jwt.sign(this.#secret);
	}
}

/**
 * @unstable
 * @group Tokens
 *
 * A TokenService with multiple verification methods and a single signer
 */
export class CompositeTokens implements TokenService {
	signer: TokenService;
	verifiers: TokenService[];
	constructor(signer: TokenService, verifiers: TokenService[]) {
		this.signer = signer;
		this.verifiers = verifiers;
	}

	async verify(token: string): Promise<AuthzToken | null> {
		for (const verifier of this.verifiers) {
			const result = await verifier.verify(token);
			if (result) return result;
		}
		return null;
	}
	sign(scope: string, options: SignTokenOptions = {}): Promise<string> {
		return this.signer.sign(scope, options);
	}
}
