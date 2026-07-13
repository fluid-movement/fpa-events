import { describe, it, expect } from 'vitest';
import { isEventManager } from './authz';

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
});
