import type { StandardSchemaV1 } from "../config/mod.ts";
import { HTTPError } from "./http-error.ts";

/**
 * @unstable
 * @group Validation
 *
 * Get and parse well-known request bodies based on the Content-Type header supplied
 *
 * ```js
 *
 * // Parse a application/x-www-form-urlencoded or multipart/form-data request
 * const formData = await getRequestBody(
 *   new Request('http://localhost:8000', { body: new FormData() })
 * )
 *
 * // Parse a JSON request
 * const json = await getRequestBody(
 *   new Request('http://localhost:8000', {
 *     body: JSON.stringify({ hello: 'world' }),
 *     headers: { 'Content-Type': 'application/json' },
 *   })
 * )
 * ```
 */
export function getRequestBody(request: Request) {
	const ct = request.headers.get("Content-Type");
	if (
		ct?.startsWith("application/x-www-form-urlencoded") ||
		ct?.startsWith("multipart/form-data")
	) {
		return request.formData();
	}

	return request.json();
}

/**
 * @unstable
 * @group Validation
 *
 * Validate the body of a request against a [StandardSchema](https://standardschema.dev/) (which includes gruber Structures).
 *
 * This will throw nice {@link HTTPError} errors that are caught by gruber and sent along to the user.
 *
 * ```js
 * const struct = Structure.object({ name: Structure.string() })
 *
 * const body1 = await assertRequestBody(struct, new Request('...'))
 * ```
 *
 * or from a JavaScript value:
 *
 * ```js
 * const struct = Structure.object({ name: Structure.string() })
 *
 * const body2 = assertRequestBody(struct, { ... })
 * const body3 = assertRequestBody(struct, new FormData(...))
 * const body3 = assertRequestBody(struct, new URLSearchParams(...))
 * ```
 *
 * you can use any StandardSchema library with this:
 *
 * ```js
 * import { z } from 'zod'
 *
 * const body4 = assertRequestBody(
 *   z.object({ name: z.string() }),
 *   { name: "Geoff Testington" }
 * )
 * ```
 */
export function assertRequestBody<T extends StandardSchemaV1>(
	schema: T,
	input: Request,
): Promise<StandardSchemaV1.InferOutput<T>>;
export function assertRequestBody<T extends StandardSchemaV1>(
	schema: T,
	input: unknown,
): StandardSchemaV1.InferOutput<T>;
export function assertRequestBody<T extends StandardSchemaV1>(
	schema: T,
	input: StandardSchemaV1.InferInput<T> | Request,
): StandardSchemaV1.InferOutput<T> | Promise<StandardSchemaV1.InferOutput<T>> {
	// If passed a request, return a promise to resolve the body and validate it
	if (input instanceof Request) {
		return getRequestBody(input).then((v) => assertRequestBody(schema, v));
	}

	// If passed form data, turn it into an object
	if (input instanceof FormData) {
		input = Object.fromEntries(input.entries());
	}

	// If passed search parameters, turn them into an object
	if (input instanceof URLSearchParams) {
		input = Object.fromEntries(input);
	}

	// Attempt to validate the input, or throw a useful HTTPError

	const result = schema["~standard"].validate(input);

	// I'm not sure how to handle async StandardSchemas yet
	if (result instanceof Promise) {
		throw HTTPError.internalServerError("async not supported");
	}

	if (result.issues) {
		throw HTTPError.badRequest(
			"Invalid request body:\n • " +
				result.issues
					.map(({ path = [], message }) =>
						path.length > 0 ? `${path.join(".")} - ${message}` : message,
					)
					.join("\n • "),
		);
	}

	return result.value;
}
