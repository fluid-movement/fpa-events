import { DrizzleQueryError } from 'drizzle-orm';
import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/core';
import { scrubBreadcrumb, scrubEvent, trackerOptions } from './error-tracking';

function leakyEvent(): ErrorEvent {
	return {
		type: undefined,
		message: 'boom',
		transaction: '/invite/[token]',
		tags: { errorId: 'abcd1234', url: 'https://x.test/invite/SECRET' },
		user: { id: 'u1', email: 'a@b.test', username: 'Ann', ip_address: '1.2.3.4' },
		request: {
			url: 'https://x.test/api/calendar/SECRET/feed.ics?token=SECRET',
			query_string: 'token=SECRET',
			cookies: { session: 'SECRET' },
			headers: { cookie: 'session=SECRET' }
		},
		breadcrumbs: [{ category: 'navigation', data: { to: '/invite/SECRET' } }]
	};
}

describe('scrubEvent', () => {
	it('drops the request, breadcrumbs and any personal user fields', () => {
		const out = scrubEvent(leakyEvent());
		expect(out.request).toBeUndefined();
		expect(out.breadcrumbs).toBeUndefined();
		expect(out.user).toEqual({ id: 'u1' });
		expect(out.tags).toEqual({ errorId: 'abcd1234' });
		expect(JSON.stringify(out)).not.toContain('SECRET');
		expect(JSON.stringify(out)).not.toContain('a@b.test');
	});

	it('keeps the route id and error id', () => {
		const out = scrubEvent(leakyEvent());
		expect(out.transaction).toBe('/invite/[token]');
		expect(out.tags?.errorId).toBe('abcd1234');
	});

	it('removes a user without an id and a URL-shaped transaction', () => {
		const event = leakyEvent();
		event.user = { email: 'a@b.test' };
		event.transaction = 'https://x.test/invite/SECRET';
		const out = scrubEvent(event);
		expect(out.user).toBeUndefined();
		expect(out.transaction).toBeUndefined();
	});
});

describe('scrubBreadcrumb', () => {
	it('drops every breadcrumb', () => {
		expect(scrubBreadcrumb({ category: 'fetch', data: { url: '/invite/SECRET' } })).toBeNull();
	});
});

describe('trackerOptions', () => {
	it('is disabled for a blank or missing DSN', () => {
		expect(trackerOptions('').enabled).toBe(false);
		expect(trackerOptions(undefined).enabled).toBe(false);
	});

	it('is enabled without default PII for a DSN', () => {
		const options = trackerOptions('https://key@glitchtip.test/1');
		expect(options.enabled).toBe(true);
		expect(options.sendDefaultPii).toBe(false);
	});
});

describe('query value redaction', () => {
	const EMAIL = 'victim@secret.test';
	const TOKEN = 'tok_SECRET123';
	const sql = 'select "id" from "user" where "email" = $1 and "token" = $2';

	/** Builds a real PostgresError (the constructor is private to the driver). */
	function pgError(message: string, detail: string) {
		const err = new (postgres.PostgresError as unknown as new (x: object) => Error)({
			message,
			detail,
			code: '23505'
		});
		return err;
	}

	function eventFor(error: Error): ErrorEvent {
		const values = [];
		for (let e: Error | undefined = error; e; e = e.cause as Error | undefined) {
			values.unshift({ type: e.constructor.name, value: e.message });
		}
		return {
			type: undefined,
			message: error.message,
			logentry: { message: error.message },
			exception: { values }
		};
	}

	it('cuts the params tail from a Drizzle error and its cause chain', () => {
		const cause = pgError('invalid byte sequence for encoding "UTF8": 0x00', `${EMAIL}`);
		const error = new DrizzleQueryError(sql, [EMAIL, TOKEN], cause);
		const out = scrubEvent(eventFor(error));
		const json = JSON.stringify(out);
		expect(json).not.toContain(EMAIL);
		expect(json).not.toContain(TOKEN);
		expect(json).not.toContain('params:');
		expect(out.exception?.values?.some((v) => v.value === `Failed query: ${sql}`)).toBe(true);
		expect(out.message).toBe(`Failed query: ${sql}`);
		expect(out.logentry?.message).toBe(`Failed query: ${sql}`);
		expect(out.exception?.values?.some((v) => v.type === 'PostgresError')).toBe(true);
	});

	it.each([
		'duplicate key value violates unique constraint "ix"\nKey (email)=(a@b.c) already exists.',
		'invalid input value for enum status: "a@b.c"',
		'date/time field value out of range: "a@b.c"',
		'malformed array literal: "a@b.c"',
		'duplicate key\nKey (lower((email)::text))=(a@b.c) already exists.',
		'null value in column "x" violates not-null constraint\nFailing row contains (1, a@b.c, tok).',
		'weird ) ( "quote\nnewline a@b.c'
	])('drops the whole message of a PostgresError: %s', (message) => {
		const error = pgError(message, 'Key (email)=(a@b.c) already exists.');
		const event = eventFor(error);
		event.exception!.values![0].stacktrace = { frames: [{ function: 'insertUser' }] };
		event.exception!.values![0].mechanism = { type: 'x', handled: false, data: { code: '23505' } };
		const out = scrubEvent(event);
		const entry = out.exception!.values![0];
		expect(entry.value).toBe('[database error: message dropped]');
		expect(entry.type).toBe('PostgresError');
		expect(entry.stacktrace!.frames![0].function).toBe('insertUser');
		expect(entry.mechanism!.data).toEqual({ code: '23505' });
		expect(out.exception!.values!.length).toBe(1);
	});

	it('drops the message of an untyped entry shaped like a Postgres error', () => {
		const out = scrubEvent({
			type: undefined,
			exception: { values: [{ value: 'Key (email)=(a@b.c) already exists.' }] }
		} as ErrorEvent);
		expect(out.exception!.values![0].value).toBe('[database error: message dropped]');
	});

	it('does not throw on non-string or null entries and never keeps them', () => {
		const event = {
			type: undefined,
			message: 123,
			logentry: null,
			exception: {
				values: [
					null,
					42,
					{ value: 42 },
					{ value: { a: 'a@b.c' }, stacktrace: { frames: [null, { vars: { e: 'a@b.c' } }] } },
					{ value: 'x', stacktrace: null }
				]
			},
			spans: [null, 7, { data: { 'drizzle.query.params': ['a@b.c'] } }]
		} as unknown as ErrorEvent;
		const out = scrubEvent(event);
		expect(JSON.stringify(out)).not.toContain('a@b.c');
		expect(out.exception!.values![0].value).toBe('[redacted]');
		expect(out.message).toBe('[redacted]');
		expect(() =>
			scrubEvent({ exception: { values: null }, tags: 5 } as unknown as ErrorEvent)
		).not.toThrow();
	});

	it('drops extra, stack-frame variables and span data', () => {
		const event = {
			type: undefined,
			extra: { params: [EMAIL] },
			exception: {
				values: [
					{ value: 'x', stacktrace: { frames: [{ function: 'f', vars: { email: EMAIL } }] } }
				]
			},
			spans: [{ data: { 'drizzle.query.params': [EMAIL] }, op: 'db' }]
		} as unknown as ErrorEvent;
		expect(JSON.stringify(scrubEvent(event))).not.toContain(EMAIL);
	});

	it('leaves tracing and local variables off', () => {
		const options = trackerOptions('https://key@glitchtip.test/1') as Record<string, unknown>;
		expect(options.tracesSampleRate).toBeUndefined();
		expect(options.tracesSampler).toBeUndefined();
		expect(options.includeLocalVariables).toBeUndefined();
	});
});
