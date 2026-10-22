import { describe, it, expect } from 'vitest';
import {
	isEventDetail,
	isPaginatedEvents,
	isPlayerProfile,
	isRankingStandings,
	isSeriesList
} from './shapes';

describe('fpa-api shape guards', () => {
	it.each([[{}], [null], [[]], ['x'], [{ items: 'no', total: 1 }], [{ items: [] }]])(
		'reject %j as an events page',
		(value) => {
			expect(isPaginatedEvents(value)).toBe(false);
		}
	);

	it('accept the minimal real shapes', () => {
		expect(isPaginatedEvents({ items: [{ resultCount: 1 }], total: 1 })).toBe(true);
		expect(isRankingStandings({ series: 's', items: [{ breakdown: [] }], total: 1 })).toBe(true);
		expect(isSeriesList({ series: [{}] })).toBe(true);
		expect(isEventDetail({ event: {}, results: [{ rounds: [] }] })).toBe(true);
		expect(
			isPlayerProfile({ player: {}, stats: {}, placements: [], rankings: [], ratings: [] })
		).toBe(true);
	});

	it('reject a profile or event missing the parts callers dereference', () => {
		expect(isPlayerProfile({ player: {}, stats: {} })).toBe(false);
		expect(isEventDetail({ event: {}, results: [{}] })).toBe(false);
		expect(isRankingStandings({ series: 's', items: [{}], total: 1 })).toBe(false);
	});
});
