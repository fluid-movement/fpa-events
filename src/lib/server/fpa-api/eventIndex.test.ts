import { describe, it, expect, vi, afterEach } from 'vitest';
import {
	facetsOf,
	filterEvents,
	loadEventIndex,
	resetEventIndexCache,
	type IndexedEvent
} from './eventIndex';
import type { EventSummary } from './types';

/**
 * The reason this module exists is that we cannot delegate to the API's own
 * filtering, so these tests are mostly about the cases where delegating would
 * have been wrong.
 */

afterEach(() => {
	resetEventIndexCache();
	vi.restoreAllMocks();
});

const event = (over: Partial<EventSummary> & Pick<EventSummary, 'id'>): EventSummary => ({
	name: `Event ${over.id}`,
	startDate: '2024-06-01',
	endDate: '2024-06-01',
	divisions: ['Open Pairs'],
	resultCount: 1,
	...over
});

/**
 * One page of `GET /events`, as the API frames it.
 *
 * A factory, not a value: a Response body can only be read once, so a mock
 * that resolves to the same object twice hands the second caller an empty
 * stream and fails as malformed JSON.
 */
const pageOf =
	(items: EventSummary[], total = items.length) =>
	() =>
		Promise.resolve(new Response(JSON.stringify({ items, total, limit: 500, offset: 0 })));

const index = (events: EventSummary[]): IndexedEvent[] =>
	events.map((e) => ({
		...e,
		dateKey: e.startDate ? normalize(e.startDate) : null,
		year: e.startDate ? Number(normalize(e.startDate).slice(0, 4)) : null,
		searchName: e.name.toLowerCase()
	}));

const normalize = (d: string) => {
	const [y, m, day] = d.split('-');
	return `${y}-${m.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

describe('loadEventIndex', () => {
	it('drops events with no results', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			pageOf([event({ id: 'a' }), event({ id: 'b', resultCount: 0 })])
		);

		const events = await loadEventIndex();

		expect(events.map((e) => e.id)).toEqual(['a']);
	});

	it('follows pagination until it has every event', async () => {
		const first = Array.from({ length: 500 }, (_, i) => event({ id: `a${i}` }));
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(pageOf(first, 501))
			.mockImplementationOnce(pageOf([event({ id: 'last' })], 501));

		const events = await loadEventIndex();

		expect(events).toHaveLength(501);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(String(fetchSpy.mock.calls[1]![0])).toContain('offset=500');
	});

	it('orders newest first across mixed date padding', async () => {
		// The upstream data really does carry both forms. Sorting the raw strings
		// would put 2020-2-8 below 2020-10-01.
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			pageOf([
				event({ id: 'jan', startDate: '2020-1-4' }),
				event({ id: 'oct', startDate: '2020-10-01' }),
				event({ id: 'feb', startDate: '2020-2-8' })
			])
		);

		const events = await loadEventIndex();

		expect(events.map((e) => e.id)).toEqual(['oct', 'feb', 'jan']);
	});

	it('sorts undated events last rather than to 1970', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			pageOf([
				event({ id: 'undated', startDate: null, endDate: null }),
				event({ id: 'dated', startDate: '2001-01-01' })
			])
		);

		const events = await loadEventIndex();

		expect(events.map((e) => e.id)).toEqual(['dated', 'undated']);
	});

	it('serves a second call from cache', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(pageOf([event({ id: 'a' })]));

		await loadEventIndex();
		await loadEventIndex();

		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('refetches once the TTL has passed', async () => {
		vi.useFakeTimers();
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(pageOf([event({ id: 'a' })]));

		await loadEventIndex();
		vi.advanceTimersByTime(5 * 60 * 1000 + 1);
		await loadEventIndex();

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});

	it('shares one request between concurrent callers', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(pageOf([event({ id: 'a' })]));

		await Promise.all([loadEventIndex(), loadEventIndex(), loadEventIndex()]);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('does not cache a failure, and retries on the next call', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockRejectedValueOnce(new Error('offline'))
			.mockImplementation(pageOf([event({ id: 'a' })]));

		await expect(loadEventIndex()).rejects.toThrow();
		await expect(loadEventIndex()).resolves.toHaveLength(1);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});

describe('filterEvents', () => {
	const events = index([
		event({ id: 'a', name: 'Berlin Spring Hat', startDate: '2020-2-8', divisions: ['Open Pairs'] }),
		event({ id: 'b', name: 'Amsterdam Jam', startDate: '2020-10-01', divisions: ['Women Pairs'] }),
		event({ id: 'c', name: 'Berlin Winter', startDate: '2021-03-04', divisions: ['Open Pairs'] })
	]);

	it('keeps a single-digit month inside its own year', () => {
		// Regression against the upstream bug this module exists to avoid: the
		// API's own from/to filter compares dates as strings, so asking it for
		// 2020-01-01..2020-12-31 drops "2020-2-8".
		const ids = filterEvents(events, { year: 2020 }).map((e) => e.id);

		expect(ids).toContain('a');
		expect(ids).toEqual(['a', 'b']);
	});

	it('matches names case-insensitively on a substring', () => {
		expect(filterEvents(events, { q: 'berlin' }).map((e) => e.id)).toEqual(['a', 'c']);
		expect(filterEvents(events, { q: '  JAM ' }).map((e) => e.id)).toEqual(['b']);
	});

	it('filters by division', () => {
		expect(filterEvents(events, { division: 'Women Pairs' }).map((e) => e.id)).toEqual(['b']);
	});

	it('combines filters', () => {
		expect(filterEvents(events, { q: 'berlin', year: 2021 }).map((e) => e.id)).toEqual(['c']);
	});

	it('returns everything when nothing is set', () => {
		expect(filterEvents(events, {})).toHaveLength(3);
	});
});

describe('facetsOf', () => {
	it('lists years newest first and divisions by frequency', () => {
		const facets = facetsOf(
			index([
				event({ id: 'a', startDate: '2020-2-8', divisions: ['Open Pairs'] }),
				event({ id: 'b', startDate: '2021-01-01', divisions: ['Open Pairs', 'Women Pairs'] }),
				event({ id: 'c', startDate: '2020-05-01', divisions: ['Open Pairs'] })
			])
		);

		expect(facets.years).toEqual([2021, 2020]);
		expect(facets.divisions).toEqual(['Open Pairs', 'Women Pairs']);
	});

	it('omits undated events from the year list', () => {
		const facets = facetsOf(index([event({ id: 'a', startDate: null, endDate: null })]));

		expect(facets.years).toEqual([]);
	});
});
