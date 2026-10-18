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

/** SDK metadata and the errorId tag set by both hooks; new tags need review. */
const TAG_FIELDS = [
	'errorId',
	'release',
	'environment',
	'os.name',
	'server_name',
	'runtime',
	'browser',
	'browser.name'
] as const;

/** Machine metadata only: no device name, app paths, URLs or arbitrary data. */
const CONTEXT_FIELDS = {
	os: ['name', 'version', 'build', 'kernel_version'],
	runtime: ['name', 'version', 'build'],
	app: [
		'app_identifier',
		'app_version',
		'app_build',
		'app_start_time',
		'build_type',
		'app_memory',
		'free_memory'
	],
	device: [
		'family',
		'model',
		'model_id',
		'arch',
		'manufacturer',
		'brand',
		'screen_resolution',
		'screen_height_pixels',
		'screen_width_pixels',
		'screen_density',
		'screen_dpi',
		'memory_size',
		'processor_count'
	],
	culture: ['calendar', 'locale', 'is_24_hour_format', 'timezone'],
	browser: ['name', 'version']
} as const;

/** Mechanisms may carry a SQL state, never error detail or arbitrary SDK data. */
const MECHANISM_DATA_FIELDS = ['code'] as const;
const MECHANISM_CODE = /^[a-zA-Z0-9]{1,32}$/;

/** Browser labels are SDK names, not arbitrary strings or page URLs. */
const BROWSER_NAME =
	/^(?:Chrome|Chrome Mobile|Chrome Mobile iOS|Chromium|Firefox|Firefox Mobile|Firefox iOS|Safari|Mobile Safari|Edge|Edge Mobile|Opera|Opera Mobile|Opera Mini|Samsung Internet|Android|IE|HeadlessChrome)(?: \d+(?:\.\d+)*)?$/;
const BROWSER_VERSION = /^\d+(?:\.\d+)*$/;

/** Text shaped like a Postgres server error that reached us without a type. */
const POSTGRES_SHAPE = /\)=\(|Failing row contains|\nDETAIL:|: "/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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

/** Remove first: if a transform throws, its field stays absent. */
function scrubField<T extends object, K extends keyof T>(
	target: T,
	key: K,
	transform: (value: T[K]) => T[K] | undefined
) {
	try {
		const value = target[key];
		delete target[key];
		const clean = transform(value);
		if (clean !== undefined) target[key] = clean;
	} catch {
		delete target[key];
	}
}

/** Pick scalar metadata only; nested objects could contain arbitrary user text. */
function pickMetadata(value: unknown, fields: readonly string[]) {
	if (!isRecord(value)) return undefined;
	const clean: Record<string, string | number | boolean> = {};
	for (const key of fields) {
		try {
			const item = value[key];
			if (
				typeof item === 'string' ||
				typeof item === 'boolean' ||
				(typeof item === 'number' && Number.isFinite(item))
			)
				clean[key] = item;
		} catch {
			// A broken SDK field is omitted, never copied through.
		}
	}
	return clean;
}

/**
 * Strips an event down to what is safe to send: no request (URL, query string,
 * cookies, headers, body), no breadcrumbs, and a user reduced to its id.
 */
export function scrubEvent<T extends ErrorEvent>(input: T): T;
export function scrubEvent(input: unknown): ErrorEvent;
export function scrubEvent(input: unknown): ErrorEvent {
	// Work on a plain object so even frozen input and throwing getters are safe.
	const event: ErrorEvent = { type: undefined };
	try {
		if (!isRecord(input)) return event;
		for (const key of Object.keys(input)) {
			try {
				Object.defineProperty(event, key, {
					value: input[key],
					enumerable: true,
					configurable: true,
					writable: true
				});
			} catch {
				// An unreadable field has no safe value to retain.
			}
		}
	} catch {
		return event;
	}
	delete event.request;
	delete event.breadcrumbs;
	scrubField(event, 'user', (user) => (user?.id !== undefined ? { id: user.id } : undefined));
	// A transaction name must be a route id, never a URL.
	scrubField(event, 'transaction', (name) =>
		typeof name === 'string' && name.startsWith('/') && !name.includes('://') ? name : undefined
	);
	for (const key of ['release', 'environment'] as const) {
		scrubField(event, key, (value) => (typeof value === 'string' ? value : undefined));
	}
	scrubField(event, 'tags', (tags) => {
		const clean = pickMetadata(tags, TAG_FIELDS);
		if (!clean) return undefined;
		for (const key of ['browser', 'browser.name']) {
			if (typeof clean[key] !== 'string' || !BROWSER_NAME.test(clean[key])) delete clean[key];
		}
		return clean;
	});
	scrubField(event, 'contexts', (contexts) => {
		if (!isRecord(contexts)) return undefined;
		const clean: NonNullable<ErrorEvent['contexts']> = {};
		for (const [key, fields] of Object.entries(CONTEXT_FIELDS)) {
			scrubField(clean, key, () => {
				const context = pickMetadata(contexts[key], fields);
				if (key === 'browser' && context) {
					if (typeof context.name !== 'string' || !BROWSER_NAME.test(context.name))
						delete context.name;
					if (typeof context.version !== 'string' || !BROWSER_VERSION.test(context.version))
						delete context.version;
				}
				return context;
			});
		}
		return clean;
	});
	// Exception text carries query values (Drizzle params, Postgres details).
	scrubField(event, 'message', (message) =>
		message === undefined ? undefined : redactErrorText(message)
	);
	scrubField(event, 'logentry', (logentry) => {
		if (!isRecord(logentry)) return undefined;
		if (logentry.message !== undefined) logentry.message = redactErrorText(logentry.message);
		delete logentry.params;
		return logentry;
	});
	scrubField(event, 'exception', (exception) => {
		if (!isRecord(exception) || !Array.isArray(exception.values)) return undefined;
		exception.values = exception.values.filter(isRecord);
		for (const entry of exception.values) {
			if (entry.value !== undefined) entry.value = redactErrorText(entry.value, entry.type);
			scrubField(entry, 'mechanism', (mechanism) => {
				if (!isRecord(mechanism)) return undefined;
				scrubField(mechanism, 'data', (data) => {
					const clean = pickMetadata(data, MECHANISM_DATA_FIELDS);
					return typeof clean?.code === 'string' && MECHANISM_CODE.test(clean.code)
						? { code: clean.code }
						: undefined;
				});
				return mechanism;
			});
			const trace = entry.stacktrace;
			if (!isRecord(trace) || !Array.isArray(trace.frames)) continue;
			const frames = trace.frames.filter(isRecord);
			trace.frames = frames;
			// Local variables of a stack frame can hold anything a user typed.
			for (const frame of frames) delete frame.vars;
		}
		return exception;
	});
	// Free-form data and span attributes (`drizzle.query.params`) never leave.
	delete event.extra;
	const loose = event as { spans?: unknown };
	scrubField(loose, 'spans', (spans) => {
		if (!Array.isArray(spans)) return undefined;
		const clean = spans.filter(isRecord);
		for (const span of clean) delete span.data;
		return clean;
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
