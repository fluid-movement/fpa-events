import { beforeEach, expect, it, vi } from 'vitest';

const { select, autocomplete, request } = vi.hoisted(() => ({
	select: vi.fn(),
	autocomplete: vi.fn(),
	request: { locals: {} as App.Locals }
}));
vi.mock('#lib/server/db', () => ({ db: { select } }));
vi.mock('#lib/geocoding', () => ({ autocomplete }));
vi.mock('$app/server', () => ({ getRequestEvent: () => request }));

import { load } from './+page.server';

const event = { id: '01M5A4T2FTPAV4Y429PTTQZKJ7', userId: 'owner', location: 'Berlin' };

function runLoad() {
	return load({ params: { id: event.id }, locals: request.locals } as Parameters<typeof load>[0]);
}

beforeEach(() => {
	vi.resetAllMocks();
	request.locals = { user: undefined, session: undefined, role: 'user' };
});

it('rejects anonymous leaf loads before any database read or geocoding', async () => {
	await expect(runLoad()).rejects.toMatchObject({ status: 307, location: '/sign-in' });
	expect(select).not.toHaveBeenCalled();
	expect(autocomplete).not.toHaveBeenCalled();
});

it('rejects non-managers before reading schedule/location data or geocoding', async () => {
	request.locals.user = { id: 'outsider' } as NonNullable<App.Locals['user']>;
	// Real authz reads the event and then looks for an accepted organizer seat.
	for (const rows of [[event], []]) {
		select.mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => rows }) }) });
	}
	await expect(runLoad()).rejects.toMatchObject({ status: 403 });
	expect(select).toHaveBeenCalledTimes(2);
	expect(autocomplete).not.toHaveBeenCalled();
});
