import { describe, it, expect } from 'vitest';
import { joinScoringResults } from './breakdown';
import type { RankingBreakdownEntry } from '#lib/server/fpa-api/types';
import type { CareerEntry } from '#lib/results/types';

const entry = (over: Partial<RankingBreakdownEntry> = {}): RankingBreakdownEntry => ({
	resultId: 'res-1',
	points: 360,
	eventId: 'ev-1',
	eventName: 'FPAW2024',
	division: 'Open Pairs',
	...over
});

const career = (over: Partial<CareerEntry> = {}): CareerEntry => ({
	resultId: 'res-1',
	eventId: 'ev-1',
	eventName: 'FPAW2024',
	eventDate: '2024-08-01',
	division: 'Open Pairs',
	roundName: 'Finals',
	place: 1,
	teammates: [{ id: 'p-2', fullName: 'A Partner', unknown: false }],
	...over
});

describe('joinScoringResults', () => {
	it('attaches the teammates and placing of the matching result', () => {
		const [result] = joinScoringResults([entry()], [career()]);

		expect(result).toMatchObject({
			eventName: 'FPAW2024',
			points: 360,
			place: 1,
			roundName: 'Finals'
		});
		expect(result.teammates).toEqual([{ id: 'p-2', fullName: 'A Partner', unknown: false }]);
	});

	it('joins on resultId, not on the event name', () => {
		// Two divisions of one event share a name but not a result id.
		const results = joinScoringResults(
			[
				entry({ resultId: 'res-a', division: 'Open Pairs' }),
				entry({ resultId: 'res-b', division: 'Open Co-op' })
			],
			[
				career({ resultId: 'res-b', division: 'Open Co-op', place: 3, teammates: [] }),
				career({
					resultId: 'res-a',
					division: 'Open Pairs',
					place: 1,
					teammates: [{ id: 'p-9', fullName: 'Right Partner', unknown: false }]
				})
			]
		);

		expect(results[0]).toMatchObject({ division: 'Open Pairs', place: 1 });
		expect(results[0].teammates[0].fullName).toBe('Right Partner');
		expect(results[1]).toMatchObject({ division: 'Open Co-op', place: 3 });
	});

	it('keeps a scoring event that has no matching placement', () => {
		// The points were really earned; dropping the row would hide part of what
		// the ranking is built from.
		const [result] = joinScoringResults([entry({ resultId: 'orphan' })], [career()]);

		expect(result).toMatchObject({ eventName: 'FPAW2024', points: 360 });
		expect(result.place).toBeNull();
		expect(result.roundName).toBeNull();
		expect(result.teammates).toEqual([]);
	});

	it('preserves the order the ranking gave, which is points-first', () => {
		const results = joinScoringResults(
			[
				entry({ resultId: 'a', points: 400 }),
				entry({ resultId: 'b', points: 200 }),
				entry({ resultId: 'c', points: 300 })
			],
			[]
		);

		expect(results.map((r) => r.points)).toEqual([400, 200, 300]);
	});

	it('labels the nullable name and division fields rather than rendering null', () => {
		const [result] = joinScoringResults([entry({ eventName: null, division: null })], []);

		expect(result.eventName).toBe('Unknown event');
		expect(result.division).toBe('Unknown division');
	});

	it('passes a null eventId through so the caller can skip the link', () => {
		const [result] = joinScoringResults([entry({ eventId: null })], []);

		expect(result.eventId).toBeNull();
	});

	it('returns nothing for a player with no scoring events', () => {
		expect(joinScoringResults([], [career()])).toEqual([]);
	});
});
