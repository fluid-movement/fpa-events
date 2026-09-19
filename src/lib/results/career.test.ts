import { describe, it, expect } from 'vitest';
import { collapsePlacements } from './career';
import type { PlayerPlacement } from '$lib/server/fpa-api/types';

const placement = (
	over: Partial<PlayerPlacement> & Pick<PlayerPlacement, 'eventId' | 'round' | 'roundName'>
): PlayerPlacement => ({
	resultId: `r-${over.eventId}-${over.round}`,
	eventName: `Event ${over.eventId}`,
	eventDate: '2024-06-01',
	division: 'Open Pairs',
	pool: 'A',
	place: 1,
	points: 100,
	teammates: [],
	...over
});

describe('collapsePlacements', () => {
	it('keeps only the deepest round reached in an event and division', () => {
		// Rounds count backwards, so 1 (the final) is the deepest.
		const career = collapsePlacements([
			placement({ eventId: 'e1', round: 3, roundName: 'Quarterfinals', place: 2 }),
			placement({ eventId: 'e1', round: 1, roundName: 'Finals', place: 4 }),
			placement({ eventId: 'e1', round: 2, roundName: 'Semifinals', place: 1 })
		]);

		expect(career).toHaveLength(1);
		expect(career[0]).toMatchObject({ roundName: 'Finals', place: 4 });
	});

	it('does not merge two divisions of the same event', () => {
		const career = collapsePlacements([
			placement({ eventId: 'e1', round: 1, roundName: 'Finals', division: 'Open Pairs' }),
			placement({ eventId: 'e1', round: 1, roundName: 'Finals', division: 'Mixed Pairs' })
		]);

		expect(career.map((c) => c.division).sort()).toEqual(['Mixed Pairs', 'Open Pairs']);
	});

	it('does not merge the same division across two events', () => {
		const career = collapsePlacements([
			placement({ eventId: 'e1', round: 1, roundName: 'Finals' }),
			placement({ eventId: 'e2', round: 1, roundName: 'Finals' })
		]);

		expect(career).toHaveLength(2);
	});

	it('keeps a player who never reached the final at the round they did reach', () => {
		const career = collapsePlacements([
			placement({ eventId: 'e1', round: 4, roundName: 'Prelims', place: 7 }),
			placement({ eventId: 'e1', round: 3, roundName: 'Quarterfinals', place: 5 })
		]);

		expect(career[0]).toMatchObject({ roundName: 'Quarterfinals', place: 5 });
	});

	it('orders newest first across mixed date padding', () => {
		// Sorting the raw strings would put 2020-2-8 below 2020-10-01.
		const career = collapsePlacements([
			placement({ eventId: 'jan', round: 1, roundName: 'Finals', eventDate: '2020-1-4' }),
			placement({ eventId: 'oct', round: 1, roundName: 'Finals', eventDate: '2020-10-01' }),
			placement({ eventId: 'feb', round: 1, roundName: 'Finals', eventDate: '2020-2-8' })
		]);

		expect(career.map((c) => c.eventId)).toEqual(['oct', 'feb', 'jan']);
	});

	it('sorts undated entries last', () => {
		const career = collapsePlacements([
			placement({ eventId: 'undated', round: 1, roundName: 'Finals', eventDate: null }),
			placement({ eventId: 'dated', round: 1, roundName: 'Finals', eventDate: '2001-01-01' })
		]);

		expect(career.map((c) => c.eventId)).toEqual(['dated', 'undated']);
	});

	it('carries the teammates of the round it kept', () => {
		const career = collapsePlacements([
			placement({
				eventId: 'e1',
				round: 2,
				roundName: 'Semifinals',
				teammates: [{ id: 'x', fullName: 'Someone Else', unknown: false }]
			}),
			placement({
				eventId: 'e1',
				round: 1,
				roundName: 'Finals',
				teammates: [{ id: 'y', fullName: 'Final Partner', unknown: false }]
			})
		]);

		expect(career[0].teammates).toEqual([{ id: 'y', fullName: 'Final Partner', unknown: false }]);
	});

	it('returns nothing for a player with no placements', () => {
		expect(collapsePlacements([])).toEqual([]);
	});
});
