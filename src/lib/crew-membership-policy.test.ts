import { describe, expect, it } from 'vitest';
import { crewExitBlocked, type CrewExit } from './crew-membership-policy';

const actions: CrewExit[] = ['leave', 'demote', 'remove', 'switch', 'deleteAccount'];

describe('last crew admin', () => {
	it.each(actions)('blocks the last admin from %s when other members remain', (action) => {
		expect(crewExitBlocked('admin', 1, 3, action)).toBe(true);
	});
	it.each(actions)('allows %s once another admin exists', (action) => {
		expect(crewExitBlocked('admin', 2, 3, action)).toBe(false);
	});
	it.each(actions)('does not restrict an ordinary member from %s', (action) => {
		expect(crewExitBlocked('member', 1, 3, action)).toBe(false);
	});
	it('allows a sole member to leave and delete their crew', () => {
		expect(crewExitBlocked('admin', 1, 1, 'leave')).toBe(false);
	});
	it.each(actions.filter((a) => a !== 'leave'))(
		'requires explicit leave for a sole admin rather than %s',
		(action) => {
			expect(crewExitBlocked('admin', 1, 1, action)).toBe(true);
		}
	);
});
