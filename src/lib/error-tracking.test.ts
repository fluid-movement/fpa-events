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
