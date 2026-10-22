// @vitest-environment node
// A malformed id or token in the path must be answered without a query: an
// integration test cannot tell that apart from an unknown id, which also 404s.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isHttpError } from '@sveltejs/kit';

const mocks = vi.hoisted(() => ({ touched: [] as PropertyKey[] }));
// Any use of the database at all — select, insert, transaction — is recorded.
vi.mock('#lib/server/db', () => ({
	db: new Proxy(
		{},
		{
			get(_, key) {
				mocks.touched.push(key);
				throw new Error(`database queried (${String(key)})`);
			}
		}
	)
}));
vi.mock('#lib/geocoding', () => ({ autocomplete: vi.fn() }));

import { load as eventPage } from './events/[id]/+page.server';
import { load as adminLayout } from './events/[id]/admin/+layout.server';
import { load as schedulePage } from './events/[id]/admin/schedule/+page.server';
import { load as invitePage } from './invite/[token]/+page.server';
import { GET as calendarFeed } from './api/calendar/[token]/feed.ics/+server';

const MALFORMED = ['not-a-stored-id', '1 or 1=1', 'x'.repeat(200), crypto.randomUUID()];
const locals = { user: { id: 'u1' }, role: 'user' };

type Load = (event: never) => unknown;
const loads: [string, Load, string][] = [
	['/events/[id]', eventPage as Load, 'id'],
	['/events/[id]/admin', adminLayout as Load, 'id'],
	['/events/[id]/admin/schedule', schedulePage as Load, 'id'],
	['/invite/[token]', invitePage as Load, 'token']
];

beforeEach(() => {
	mocks.touched.length = 0;
});

describe('malformed ids never reach the database', () => {
	for (const [route, load, param] of loads) {
		it.each(MALFORMED)(`${route} answers %s with 404`, async (value) => {
			const event = { params: { [param]: value }, locals, url: new URL('https://example.org/') };
			await expect((async () => load(event as never))()).rejects.toSatisfy((error: unknown) =>
				isHttpError(error, 404)
			);
			expect(mocks.touched).toEqual([]);
		});
	}

	it.each(['not-a-token', '01m5a4te7kpbqedtvncyxkx1gn'])(
		'the calendar feed answers %s with 404',
		async (token) => {
			const response = await calendarFeed({
				params: { token },
				url: new URL('https://example.org/')
			} as never);
			expect(response.status).toBe(404);
			expect(mocks.touched).toEqual([]);
		}
	);

	// Proves the mock would have caught a query: a well-formed id goes on to one.
	it('lets a well-formed id through to the query', async () => {
		const event = { params: { id: '01m5a4te7kpbqedtvncyxkx1gn' }, locals };
		await expect((async () => eventPage(event as never))()).rejects.toThrow('database queried');
		expect(mocks.touched).not.toEqual([]);
	});
});
