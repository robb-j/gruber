import { type JoseDependency } from "./types.ts";

export interface AuthzToken {
	userId?: number;
	scope: string;
}

export interface SignTokenOptions {
	userId?: number;
	/** milliseconds */ maxAge?: number;
}

export interface JWTService {
	verify(token: string): Promise<AuthzToken | null>;
	sign(scope: string, options?: SignTokenOptions): Promise<string>;
}

export interface JwtServiceOptions {
	secret: string;
	issuer: string;
	audience: string;
}

export class JoseJwtService implements JWTService {
	options: JwtServiceOptions;
	jose: JoseDependency;
	#secret: Uint8Array;

	get jwtVerify() {
		return this.jose.jwtVerify;
	}
	get SignJWT() {
		return this.jose.SignJWT;
	}

	constructor(options: JwtServiceOptions, jose: JoseDependency) {
		this.options = options;
		this.jose = jose;
		this.#secret = new TextEncoder().encode(options.secret);
	}

	async verify(input: string): Promise<AuthzToken | null> {
		try {
			const token = await this.jwtVerify(input, this.#secret, {
				issuer: this.options.issuer,
				audience: this.options.audience,
			});
			return {
				userId: token.payload.sub ? parseInt(token.payload.sub) : undefined,
				scope: token.payload.scope as string,
			};
		} catch (error) {
			// TODO: translate JWT errors better?
			return null;
		}
	}

	sign(scope: string, options: SignTokenOptions = {}) {
		const jwt = new this.SignJWT({ scope })
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
