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
	const event = { id: 'event-1', userId: 'owner-1' };

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
