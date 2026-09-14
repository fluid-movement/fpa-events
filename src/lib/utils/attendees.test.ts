import { describe, it, expect } from 'vitest';
import { attendeeSummary, coOrganizers, firstName } from './attendees';

describe('firstName', () => {
	it('takes the first word', () => {
		expect(firstName('Marcus Hellström')).toBe('Marcus');
	});

	it('handles a single-word name', () => {
		expect(firstName('Prince')).toBe('Prince');
	});
});

describe('attendeeSummary', () => {
	it('returns null when nobody is attending', () => {
		expect(attendeeSummary([], 0)).toBeNull();
	});

	it('names a single attendee', () => {
		expect(attendeeSummary(['Tom'], 1)).toBe('Tom is attending');
	});

	it('names two attendees', () => {
		expect(attendeeSummary(['Tom', 'Anna'], 2)).toBe('Tom and Anna are attending');
	});

	it('names three attendees', () => {
		expect(attendeeSummary(['Tom', 'Anna', 'Chris'], 3)).toBe('Tom, Anna and Chris are attending');
	});

	// Names are comma-joined once a remainder follows, avoiding the clumsy double
	// "and" of "Tom, Anna and Chris and 3 others".
	it('caps names and rolls the rest into "others"', () => {
		expect(attendeeSummary(['Tom', 'Anna', 'Chris'], 6)).toBe(
			'Tom, Anna, Chris and 3 others attending'
		);
	});

	it('uses the singular for exactly one other', () => {
		expect(attendeeSummary(['Tom', 'Anna', 'Chris'], 4)).toBe(
			'Tom, Anna, Chris and 1 other attending'
		);
	});

	it('counts opted-out attendees as others rather than dropping them', () => {
		// 5 attending, only 2 of whom allow their name to be shown
		expect(attendeeSummary(['Tom', 'Anna'], 5)).toBe('Tom, Anna and 3 others attending');
	});

	it('falls back to a plain count when everyone opted out', () => {
		expect(attendeeSummary([], 4)).toBe('4 people attending');
	});

	it('uses the singular when the only attendee opted out', () => {
		expect(attendeeSummary([], 1)).toBe('1 person attending');
	});

	it('never shows more names than the cap', () => {
		const summary = attendeeSummary(['Tom', 'Anna', 'Chris', 'Dana', 'Eli'], 5);
		expect(summary).toBe('Tom, Anna, Chris and 2 others attending');
		expect(summary).not.toContain('Dana');
	});

	describe('past events use past tense', () => {
		it('for a single attendee', () => {
			expect(attendeeSummary(['Tom'], 1, true)).toBe('Tom attended');
		});

		it('for several attendees', () => {
			expect(attendeeSummary(['Tom', 'Anna'], 2, true)).toBe('Tom and Anna attended');
		});

		it('with a remainder', () => {
			expect(attendeeSummary(['Tom'], 3, true)).toBe('Tom and 2 others attended');
		});

		it('when everyone opted out', () => {
			expect(attendeeSummary([], 3, true)).toBe('3 people attended');
		});
	});
});

describe('coOrganizers', () => {
	const OWNER = 'owner-1';
	const rows = [
		{ id: 1, status: 'organizing', userId: OWNER },
		{ id: 2, status: 'organizing', userId: 'invited-1' },
		{ id: 3, status: 'attending', userId: 'guest-1' }
	];

	it('excludes the creator, who is always an organizer but never an invitee', () => {
		expect(coOrganizers(rows, OWNER).map((r) => r.id)).toEqual([2]);
	});

	it('excludes attendees', () => {
		expect(coOrganizers(rows, OWNER).some((r) => r.status === 'attending')).toBe(false);
	});

	it('returns nothing when the only organizer is the creator', () => {
		expect(coOrganizers([rows[0], rows[2]], OWNER)).toEqual([]);
	});
});
