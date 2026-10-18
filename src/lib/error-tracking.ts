/**
 * Shared by the server and browser error-tracker setup (GlitchTip, reached
 * with the Sentry SDK).
 *
 * Nothing that identifies a request may leave the site: `/invite/[token]` and
 * `/api/calendar/[token]/feed.ics` carry their credential in the path. So the
 * event keeps the route id and the user id and drops the rest.
 */
import type { Breadcrumb, ErrorEvent } from '@sentry/core';

/** Breadcrumbs record URLs (navigation, fetch, console), so none are kept. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
	void breadcrumb;
	return null;
}

const REDACTED = '[redacted]';
const DATABASE_ERROR = '[database error: message dropped]';

/** Text shaped like a Postgres server error that reached us without a type. */
const POSTGRES_SHAPE = /\)=\(|Failing row contains|\nDETAIL:|: "/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * Allowlist for exception text. A Postgres error's message is dropped whole,
 * because it can embed any value; the type, SQL state and stack stay. A
 * Drizzle `Failed query:` message keeps its SQL (placeholders only) and loses
 * the `params:` tail. Anything else that is not a string is replaced. Never
 * throws and never returns the original text on failure.
 */
export function redactErrorText(text: unknown, type?: unknown): string {
	try {
		if (typeof text !== 'string') return REDACTED;
		if (text.startsWith('Failed query:')) return text.replace(/\r?\nparams:[\s\S]*$/, '');
		if (type === 'PostgresError' || POSTGRES_SHAPE.test(text)) return DATABASE_ERROR;
		return text.replace(/\r?\nparams:[\s\S]*$/, '');
	} catch {
		return REDACTED;
	}
}

/** Runs one scrubbing step so a failure in it cannot drop the whole event. */
function step(fn: () => void) {
	try {
		fn();
	} catch {
		// Ignored: the step's own fallback already ran or the field is absent.
	}
}

/**
 * Strips an event down to what is safe to send: no request (URL, query string,
 * cookies, headers, body), no breadcrumbs, and a user reduced to its id.
 */
export function scrubEvent<T extends ErrorEvent>(event: T): T {
	delete event.request;
	delete event.breadcrumbs;
	step(() => {
		if (event.user?.id !== undefined) event.user = { id: event.user.id };
		else delete event.user;
	});
	// A transaction name must be a route id, never a URL.
	step(() => {
		const name = event.transaction;
		if (name !== undefined && (typeof name !== 'string' || !name.startsWith('/'))) {
			delete event.transaction;
		} else if (name?.includes('://')) delete event.transaction;
	});
	// The browser SDK also puts the page URL in a few other places.
	step(() => {
		if (isRecord(event.tags)) delete event.tags.url;
		if (isRecord(event.contexts) && isRecord(event.contexts.trace)) {
			delete event.contexts.trace.data;
		}
	});
	// Exception text carries query values (Drizzle params, Postgres details).
	step(() => {
		if (event.message !== undefined) event.message = redactErrorText(event.message);
	});
	step(() => {
		if (!isRecord(event.logentry)) return;
		if (event.logentry.message !== undefined) {
			event.logentry.message = redactErrorText(event.logentry.message);
		}
		delete event.logentry.params;
	});
	step(() => {
		const exception = event.exception;
		if (!isRecord(exception) || !Array.isArray(exception.values)) return;
		exception.values = exception.values.filter(isRecord);
		for (const entry of exception.values) {
			if (entry.value !== undefined) entry.value = redactErrorText(entry.value, entry.type);
			const trace = entry.stacktrace;
			if (!isRecord(trace) || !Array.isArray(trace.frames)) continue;
			const frames = trace.frames.filter(isRecord);
			trace.frames = frames;
			// Local variables of a stack frame can hold anything a user typed.
			for (const frame of frames) delete frame.vars;
		}
	});
	// Free-form data and span attributes (`drizzle.query.params`) never leave.
	delete event.extra;
	step(() => {
		const loose = event as { spans?: unknown };
		if (!Array.isArray(loose.spans)) return;
		loose.spans = loose.spans.filter(isRecord);
		for (const span of loose.spans as Array<Record<string, unknown>>) delete span.data;
	});
	return event;
}

/** Init options common to both sides; a blank DSN leaves the SDK disabled. */
export function trackerOptions(dsn: string | undefined) {
	return {
		dsn: dsn || undefined,
		enabled: Boolean(dsn),
		sendDefaultPii: false,
		beforeSend: scrubEvent,
		beforeBreadcrumb: scrubBreadcrumb
	};
}
