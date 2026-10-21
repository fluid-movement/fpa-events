import { describe, it, expect, vi, beforeEach } from 'vitest';

// The `#lib/server/db` alias in vite.config's test block does not win over
// SvelteKit's own resolution, so mock the module explicitly here.
const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }));
vi.mock('#lib/server/db', () => ({ db: { select: selectMock } }));

import { isEventManager, canManageEvent } from './authz';

describe('isEventManager', () => {
	const event = { userId: 'owner-1' };

	it('allows the event owner', () => {
		expect(isEventManager(event, 'owner-1', 'user')).toBe(true);
	});

	it('allows a site admin who is not the owner', () => {
		expect(isEventManager(event, 'someone-else', 'admin')).toBe(true);
	});

	it('denies a non-owner non-admin user', () => {
		expect(isEventManager(event, 'someone-else', 'user')).toBe(false);
	});

	it('denies when role is undefined and user is not the owner', () => {
		expect(isEventManager(event, 'someone-else', undefined)).toBe(false);
	});

	it('denies a co-organizer — it is the owner-level check', () => {
		// Co-organizers must not pass the check that gates event deletion.
		expect(isEventManager(event, 'co-organizer-1', 'user')).toBe(false);
	});
});

describe('canManageEvent', () => {
	const event = { id: '01m5a4te7kpbqedtvncyxkx1gn', userId: 'owner-1' };

	/** Stub the `select().from().where().limit()` chain used by isEventCoOrganizer. */
	function mockCoOrganizerLookup(rows: { id: number }[]) {
		selectMock.mockReturnValue({
			from: () => ({
				where: () => ({
					limit: () => Promise.resolve(rows)
				})
			})
		});
	}

	beforeEach(() => {
		selectMock.mockReset();
	});

	it('allows the owner without querying the database', async () => {
		await expect(canManageEvent(event, 'owner-1', 'user')).resolves.toBe(true);
		expect(selectMock).not.toHaveBeenCalled();
	});

	it('allows a site admin without querying the database', async () => {
		await expect(canManageEvent(event, 'someone-else', 'admin')).resolves.toBe(true);
		expect(selectMock).not.toHaveBeenCalled();
	});

	it('allows a user holding an organizing seat on the event', async () => {
		mockCoOrganizerLookup([{ id: 7 }]);
		await expect(canManageEvent(event, 'co-organizer-1', 'user')).resolves.toBe(true);
	});

	it('denies a user with no organizing seat', async () => {
		mockCoOrganizerLookup([]);
		await expect(canManageEvent(event, 'random-user', 'user')).resolves.toBe(false);
	});

	it('denies when role is undefined and there is no organizing seat', async () => {
		mockCoOrganizerLookup([]);
		await expect(canManageEvent(event, 'random-user', undefined)).resolves.toBe(false);
	});
});

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock('$app/server', () => ({ getRequestEvent: requestMock }));

import { isHttpError } from '@sveltejs/kit';
import { requireEventManager, requireEventOwner } from './authz';

describe.each([requireEventManager, requireEventOwner])('%s request authorization', (guard) => {
	const event = { id: '01m5a4te7kpbqedtvncyxkx1gn', userId: 'owner-1' };
	function session(id: string | null, role = 'user') {
		requestMock.mockReturnValue({ locals: { user: id ? { id } : null, role } });
	}
	function rows(...results: unknown[][]) {
		for (const result of results) {
			selectMock.mockReturnValueOnce({
				from: () => ({ where: () => ({ limit: async () => result }) })
			});
		}
	}
	async function status(expected: number) {
		try {
			await guard(event.id);
			expect.fail('Expected an HttpError');
		} catch (err) {
			expect(isHttpError(err, expected)).toBe(true);
		}
	}
	beforeEach(() => {
		selectMock.mockReset();
		requestMock.mockReset();
	});
	it('rejects anonymous requests with 401 before querying', async () => {
		session(null);
		await status(401);
		expect(selectMock).not.toHaveBeenCalled();
	});
	it('returns 404 for an unknown event', async () => {
		session('owner-1');
		rows([]);
		await status(404);
	});
	it.each(['bad-id', 'bad\0id'])('rejects malformed ID %s before querying', async (id) => {
		session('owner-1');
		await expect(guard(id)).rejects.toSatisfy((err: unknown) => isHttpError(err, 400));
		expect(selectMock).not.toHaveBeenCalled();
	});
	it('denies a signed-in stranger with 403', async () => {
		session('stranger');
		rows([event], []);
		await status(403);
	});
	it.each([
		['owner-1', 'user'],
		['admin-1', 'admin']
	])('allows %s', async (id, role) => {
		session(id, role);
		rows([event]);
		await expect(guard(event.id)).resolves.toEqual(event);
	});
	it('admits co-organizers only to manager access', async () => {
		session('co-organizer');
		rows([event], [{ id: 7 }]);
		if (guard === requireEventManager) {
			await expect(guard(event.id)).resolves.toEqual(event);
		} else {
			await status(403);
		}
	});
});
