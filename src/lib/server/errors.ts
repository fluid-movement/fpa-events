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

/** `devalue.parse` rejects a structurally broken payload with exactly these. */
const DEVALUE_ERROR =
	/^(?:Invalid input|Invalid data|Invalid circular reference|Invalid ArrayBuffer encoding|Unknown type .+|Cannot parse an object with a (?:non-string key|`__proto__` property))$/;

/** Node's `Request.formData()` on a body that is not the multipart it claims. */
const FORM_DATA_ERROR = /^Failed to parse body as FormData\.?$/;

/**
 * Whether the remote-query argument in the URL is past Kit's JSON stage. This
 * mirrors `parse_remote_arg` on the server (`Buffer` base64 is lenient, so only
 * the JSON can fail) and stops before devalue; a unit test runs it against
 * Kit's own serialiser, so a change of wire format fails a test, not requests.
 */
export function remotePayloadIsJson(payload: string): boolean {
	try {
		const bytes = Buffer.from(payload.replaceAll('-', '+').replaceAll('_', '/'), 'base64');
		JSON.parse(new TextDecoder().decode(bytes));
		return true;
	} catch {
		return false;
	}
}

/**
 * Whether an `unknown` error is Kit failing to decode what the client sent, so
 * it is a 400 and not a server fault. Kit 3 throws these as plain errors before
 * any schema or callback runs (upstream bug: they deserve a 400 SvelteKitError,
 * as its other binary-form checks already throw).
 *
 * Every rule pairs the request shape with the exact error Kit or Node raises,
 * and none reads stack frames (Kit trims them in dev, bundling may rename them).
 * Each fails safe: if Kit or Node change their wording, the error is reported
 * as a 500 again — a request is never refused because of this function.
 */
export function isMalformedClientInput(error: unknown, request: Request): boolean {
	if (!(error instanceof Error)) return false;

	const kitField = KIT_FORM_FIELD_ERROR.exec(error.message);
	if (kitField && (kitField[1] === undefined || kitField[1] === kitField[2])) return true;

	const url = new URL(request.url);
	if (!url.pathname.startsWith('/_app/remote/') && !url.searchParams.has('/remote')) return false;

	const devalueError = error.constructor === Error && DEVALUE_ERROR.test(error.message);
	if (request.method === 'GET') {
		const payload = url.searchParams.get('payload');
		if (!payload) return false;
		// Kit decodes the argument before the query runs, so an argument that is
		// not even JSON means the SyntaxError is Kit's, not the callback's.
		return remotePayloadIsJson(payload) ? devalueError : error instanceof SyntaxError;
	}
	if (request.method === 'POST') {
		const type = request.headers.get('content-type') ?? '';
		if (type === 'application/x-sveltekit-formdata') return devalueError;
		return error instanceof TypeError && FORM_DATA_ERROR.test(error.message);
	}
	return false;
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
