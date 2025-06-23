import { describe, it, assertThrows, assertEquals } from "../core/test-deps.js";
import {
	_assertHasNoNewline,
	_stringify,
	ServerSentEventStream,
} from "./server-sent-events.ts";

describe("_assertHasNoNewline", () => {
	it("throws for newlines", () => {
		assertThrows(() => _assertHasNoNewline("\r", "variable", "SSE Error"));
		assertThrows(() => _assertHasNoNewline("\n", "variable", "SSE Error"));
		assertThrows(() => _assertHasNoNewline("\r\n", "variable", "SSE Error"));
	});
});

describe("__stringify", () => {
	it("formats a message", () => {
		const result = _stringify({
			comment: "hello there",
			event: "update",
			data: "this\nis\na\ntest",
			id: "abcdef",
			retry: 7,
		});

		assertEquals(
			result,
			`:hello there
event:update
data:this
data:is
data:a
data:test
id:abcdef
retry:7

`,
		);
	});
});

describe("ServerSentEventStream", () => {
	it("enqueues the messages", async () => {
		const stream = new ServerSentEventStream();

		const w = stream.writable.getWriter();
		w.write({
			event: "update",
			data: "Pizza is ready",
		});
		w.close();

		const decoder = new TextDecoder();
		const messages = [];
		for await (const m of stream.readable) {
			messages.push(decoder.decode(m));
		}

		assertEquals(messages, ["event:update\ndata:Pizza is ready\n\n"]);
	});
});
