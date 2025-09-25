// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.

const NEWLINE_REGEXP = /\r\n|\r|\n/;
const encoder = new TextEncoder();

/**
 * Represents a message in the [Server-Sent Event protocol](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#fields)
 *
 * ```js
 * // All fields are optional
 * const message = {
 *   comment: 'hello there',
 *   event: 'my-event',
 *   data: JSON.stringify({ lots: 'of', things: true }),
 *   id: 42,
 *   retry: 3600
 * }
 * ```
 */
export interface ServerSentEventMessage {
	/** Ignored by the client, can be used to prevent connections from timing out */
	comment?: string;

	/** A string identifying the type of event described. If specified this event is triggered, otherwise a "message" will be dispatched. */
	event?: string;

	/** The data field for the message. Split by new lines. */
	data?: string;

	/** The event ID to set the `EventSource` object's last event ID value. */
	id?: string | number;

	/** The reconnection time. If the connection to the server is lost, the browser will wait for the specified time before attempting to reconnect. */
	retry?: number;
}

export function _assertHasNoNewline(
	value: string,
	variable: string,
	errPrefix: string,
) {
	if (value.match(NEWLINE_REGEXP) !== null) {
		throw new SyntaxError(
			`${errPrefix}: "${variable}" cannot contain a newline`,
		);
	}
}

/**
 * Converts a server-sent message object into a string for the client.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format}
 */
export function _stringify(message: ServerSentEventMessage): string {
	const lines = [];
	if (message.comment) {
		_assertHasNoNewline(message.comment, "message.comment", "SSE Error");
		lines.push(`:${message.comment}`);
	}
	if (message.event) {
		_assertHasNoNewline(message.event, "message.event", "SSE Error");
		lines.push(`event:${message.event}`);
	}
	if (message.data) {
		message.data
			.split(NEWLINE_REGEXP)
			.forEach((line) => lines.push(`data:${line}`));
	}
	if (message.id) {
		_assertHasNoNewline(message.id.toString(), "message.id", "SSE Error");
		lines.push(`id:${message.id}`);
	}
	if (message.retry) {
		lines.push(`retry:${message.retry}`);
	}
	return lines.join("\n") + "\n\n";
}

/**
 * Transforms server-sent message objects into strings for the client.
 * [more info](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
 *
 * You can then write {@link ServerSentEventMessage} to that stream over time.
 *
 * ```js
 * const data = [{ data: "hello there" }]
 *
 * // Get a stream somehow, then pipe it through
 * const stream = ReadableStream.from<ServerSentEventMessage>(data)
 *   .pipeThrough(new ServerSentEventStream());
 *
 * const response = new Response(stream, {
 *   headers: {
 *     "content-type": "text/event-stream",
 *     "cache-control": "no-cache",
 *   },
 * });
 * ```
 */
export class ServerSentEventStream extends TransformStream<
	ServerSentEventMessage,
	Uint8Array
> {
	constructor() {
		super({
			transform: (message, controller) => {
				controller.enqueue(encoder.encode(_stringify(message)));
			},
		});
	}
}

/** @unstable */
export const sseHeaders = {
	"content-type": "text/event-stream",
	"cache-control": "no-cache",
	connection: "keep-alive",
};
