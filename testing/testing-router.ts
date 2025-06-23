import { FetchRouter, HTTPError, RouteDefinition } from "../http/mod.ts";

export interface TestingRequestInit extends RequestInit {
	dependencies?: Record<string, unknown>;
}

export class TestingRouter extends FetchRouter {
	async fetch(input: URL | string | Request, init: TestingRequestInit = {}) {
		if (typeof input === "string" && input.startsWith("/")) {
			input = `http://testing.local${input}`;
		}

		if (init.dependencies) {
			for (const route of this.routes) {
				route.dependencies.override(init.dependencies);
			}
		}

		const response = await this.getResponse(new Request(input, init));

		if (init.dependencies) {
			for (const route of this.routes) {
				route.dependencies.reset();
			}
		}

		return response;
	}

	override handleError(request: Request, error: unknown): Response {
		if (!(error instanceof HTTPError) || error.status >= 500) throw error;
		return super.handleError(request, error);
	}
}
