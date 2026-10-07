/**
 * What the server-side `handleError` hook logs and hands back for an error.
 *
 * Kept out of `hooks.server.ts` so the rules can be tested: only unexpected
 * errors get a reference id and a log line, and the line never contains a URL
 * path — the calendar feed and invite links carry their credential in it.
 */

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

/** 8 hex characters: short enough to read out, plenty for this traffic. */
export function newErrorId(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
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
	const fields = [
		`ref=${errorId}`,
		`${input.method} ${input.routeId ?? '(no route)'}`,
		`user=${input.userId ?? 'anonymous'}`,
		`${err.name}: ${err.message}`
	];
	return { errorId, logLine: `[server error] ${fields.join(' | ')}`, stack: err.stack };
}
