import { StandardSchemaV1, Structure } from "../config/mod.ts";
import { HTTPError } from "./http-error.ts";

/** @unstable */
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

/** @unstable */
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
