import { StructError, Structure } from "../core/mod.ts";
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
export function assertRequestBody<T>(
	struct: Structure<T>,
	input: Request,
): Promise<T>;
export function assertRequestBody<T>(struct: Structure<T>, input: unknown): T;
export function assertRequestBody<T>(
	struct: Structure<T>,
	input: any,
): T | Promise<T> {
	// If passed a request, return a promise to resolve the body and validate it
	if (input instanceof Request) {
		return new Promise((resolve) => {
			resolve(getRequestBody(input).then((v) => assertRequestBody(struct, v)));
		});
	}

	// If passed form data, turn it into an object
	if (input instanceof FormData) {
		input = Object.fromEntries(input.entries());
	}

	// Attempt to validate the input, or throw a useful HTTPError
	try {
		return struct.process(input);
	} catch (error) {
		if (error instanceof StructError) {
			throw HTTPError.badRequest(error.toFriendlyString());
		}
		throw Error;
	}
}
