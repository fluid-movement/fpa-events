/**
 * What the server-side `handleError` hook logs and hands back for an error.
 *
 * Kept out of `hooks.server.ts` so the rules can be tested: only unexpected
 * errors get a reference id and a log line, and the line never contains a URL
 * path — the calendar feed and invite links carry their credential in it.
 * Database messages use the same allowlist as error tracking; neither the log
 * line nor the printed stack header may contain query parameters or PG detail.
 */

import { newErrorId } from '#lib/utils/error-id';
import { redactErrorText } from '#lib/error-tracking';
import {
	BINARY_FORM_CONTENT_TYPE,
	deserializeBinaryForm,
	parseRemoteArg
} from '#lib/server/kit-decoders';

type ErrorKind = 'app' | 'framework' | 'validation' | 'unknown';

export type ServerErrorInput = {
	kind: ErrorKind;
	error: unknown;
	method: string;
	/** The matched route id, e.g. `/invite/[token]`; null when nothing matched. */
	routeId: string | null;
	userId: string | null;
};

export type ServerErrorReport = {
	/** Short id shown to the user and printed in the log, to match the two up. */
	errorId: string;
	/** One line, so a log search for the id finds everything about it. */
	logLine: string;
	stack: string | undefined;
};

export { newErrorId };

/**
 * The `at` lines of an error's own stack. The message can span lines and carry
 * fake frames (Postgres echoes values unescaped), so everything up to the end
 * of the message is dropped first; a stack that does not contain its message
 * verbatim is not trusted at all.
 */
function errorFrames(error: Error): string[] {
	const start = error.stack?.indexOf(error.message) ?? -1;
	if (!error.stack || start === -1) return [];
	return error.stack
		.slice(start + error.message.length)
		.split('\n')
		.filter((line) => /^\s+at /.test(line));
}

/**
 * A copy of an error and its causes for the error tracker. The SDK parses
 * `stack` itself, header included, so a database value echoed into a message
 * (a Drizzle parameter, a Postgres message) can turn into a fake frame whose
 * file name is that value, and `beforeSend` only sees parsed frames, so it
 * cannot tell one apart. Each copy keeps the name, the redacted message on one
 * line and only the frames below the original message.
 */
export function reportableError(error: unknown, depth = 0): Error {
	const source = error instanceof Error ? error : new Error(String(error));
	const copy = new Error(redactErrorText(source.message, source.name).replace(/\s+/g, ' '));
	copy.name = source.name;
	copy.stack = [`${copy.name}: ${copy.message}`, ...errorFrames(source)].join('\n');
	// Sentry's linked-errors integration follows `cause` (five levels by default).
	if (depth < 5 && source.cause instanceof Error) {
		copy.cause = reportableError(source.cause, depth + 1);
	}
	return copy;
}

/**
 * The report for an error, or null when the error is expected (thrown with
 * `error()`, a 404, a failed validation) and Kit's defaults already say enough.
 */
export function describeServerError(
	input: ServerErrorInput,
	errorId: string = newErrorId()
): ServerErrorReport | null {
	if (input.kind !== 'unknown') return null;

	const err = input.error instanceof Error ? input.error : new Error(String(input.error));
	const summary = `${err.name}: ${redactErrorText(err.message, err.name)}`.replace(/\s+/g, ' ');
	// Strip the entire original header before selecting frames: a PG message can
	// itself contain newlines and fake "at" lines. If the stack is unfamiliar,
	// omit it rather than risk printing part of the raw message.
	const frames = errorFrames(err);
	const fields = [
		`ref=${errorId}`,
		`${input.method} ${input.routeId ?? '(no route)'}`,
		`user=${input.userId ?? 'anonymous'}`,
		summary
	];
	return {
		errorId,
		logLine: `[server error] ${fields.join(' | ')}`,
		stack: frames.length ? [summary, ...frames].join('\n') : undefined
	};
}

/**
 * Kit's own diagnostics for a form body it will not map onto `fields` — a field
 * not built by `fields.x.as()`, a duplicated key, a prototype-pollution key. In
 * production the message is just the documented error URL; in dev (and while
 * building) it is `code\ndetail\nURL`. Both are matched whole, so text that
 * merely mentions the URL is not enough.
 */
const KIT_FORM_FIELD_ERROR =
	/^(?:(form_field_[a-z_]+)\n[\s\S]*\n)?https:\/\/svelte\.dev\/e\/kit\/(form_field_(?:unbound|duplicate|forbidden_key|invalid_name|array_conflict))$/;

/** Kit's remote endpoint, or a remote form posted without JavaScript. */
function isRemoteRequest(url: URL): boolean {
	return url.pathname.startsWith('/_app/remote/') || url.searchParams.has('/remote');
}

/**
 * A remote request with `?payload=` that is not a GET. Kit's client only puts
 * the argument in the URL for queries, which it fetches with GET; but Kit
 * decodes it for a query whatever the method. Refusing the rest in `handle`
 * means a `payload` is only ever decoded on a GET, where the classifier below
 * can re-run that decoding.
 */
export function isMisroutedRemotePayload(request: Request): boolean {
	const url = new URL(request.url);
	return request.method !== 'GET' && isRemoteRequest(url) && url.searchParams.has('payload');
}

/** Kit's `is_form_content_type`: the bodies its form handler decodes. */
const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain',
	BINARY_FORM_CONTENT_TYPE
];

/** A second copy of each remote form body, keyed by the request Kit reads. */
const formBodies = new WeakMap<Request, Request>();

/**
 * Called from `handle`, before Kit reads the body: keeps a copy of a remote
 * form POST so `isMalformedClientInput` can decode it again. The copy is a tee
 * of the same stream, so it is held to the adapter's body size limit
 * (`BODY_SIZE_LIMIT`) like the original, and is dropped with the request.
 */
export function keepRemoteFormBody(request: Request): void {
	if (request.method !== 'POST' || !request.body) return;
	if (!isRemoteRequest(new URL(request.url))) return;
	const type = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ?? '';
	if (FORM_CONTENT_TYPES.includes(type)) formBodies.set(request, request.clone());
}

async function decodingFails(decode: () => unknown): Promise<boolean> {
	try {
		await decode();
		return false;
	} catch {
		return true;
	}
}

/**
 * Whether an `unknown` error is Kit failing to decode what the client sent, so
 * it is a 400 and not a server fault. Kit 3 throws these as plain errors (a
 * devalue `Error`, a `SyntaxError`, a `TypeError`...) before any schema
 * or callback runs (upstream bug: they deserve a 400 SvelteKitError, as its
 * other binary-form checks already throw).
 *
 * The error itself is not trusted to say where it came from: a callback can
 * throw the same type with the same message. Instead Kit's own decoder is run
 * again on the same input — the query's `payload`, or the copy of the form
 * body `keepRemoteFormBody` kept. Only if that throws is the request at fault;
 * if it decodes, the callback ran and its error is reported. Without a copy
 * (body already read, no `handle` call) the error is reported.
 *
 * A body sent to a `command` endpoint with a form content type is judged by
 * the form decoder. Kit's client never sends one, so only a hand-made request
 * can have its own error classified as 400.
 */
export async function isMalformedClientInput(error: unknown, request: Request): Promise<boolean> {
	const kitField = error instanceof Error && KIT_FORM_FIELD_ERROR.exec(error.message);
	if (kitField && (kitField[1] === undefined || kitField[1] === kitField[2])) return true;

	const url = new URL(request.url);
	if (!isRemoteRequest(url)) return false;

	if (request.method === 'GET') {
		const payload = url.searchParams.get('payload');
		return payload !== null && decodingFails(() => parseRemoteArg(payload));
	}

	const body = formBodies.get(request);
	if (!body) return false;
	formBodies.delete(request);
	// The form id only matters for a non-binary body, whose field mapping errors
	// are matched above; decoding the body itself is what can fail here.
	return decodingFails(() =>
		body.headers.get('content-type') === BINARY_FORM_CONTENT_TYPE
			? deserializeBinaryForm(body, '')
			: body.formData()
	);
}

/**
 * One argument of a library's log call, as it may be printed: an error as its
 * name and redacted message (with its causes), a string redacted, anything
 * else by type only, since an object can hold whatever the request carried.
 */
export function redactLogArgument(value: unknown, depth = 0): string {
	if (value instanceof Error) {
		const text = `${value.name}: ${redactErrorText(value.message, value.name)}`;
		const cause =
			depth < 3 && value.cause !== undefined
				? ` [cause: ${redactLogArgument(value.cause, depth + 1)}]`
				: '';
		return text.replace(/\s+/g, ' ') + cause;
	}
	if (typeof value === 'string') return redactErrorText(value).replace(/\s+/g, ' ');
	if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
		return String(value);
	}
	return `[${typeof value}]`;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Better Auth's `logger.log`. Its default prints the raw error, and a failed
 * session lookup's Drizzle message carries the session token as a parameter.
 */
export function logLibraryMessage(source: string, level: LogLevel, ...args: unknown[]): void {
	const line = `[${source}] ${level}: ${args.map((arg) => redactLogArgument(arg)).join(' ')}`;
	if (level === 'error') console.error(line);
	else if (level === 'warn') console.warn(line);
	else console.log(line);
}
