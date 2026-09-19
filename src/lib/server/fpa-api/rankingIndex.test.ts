import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadRankingStandings, resetRankingCache } from './rankingIndex';

afterEach(() => {
	resetRankingCache();
	vi.restoreAllMocks();
});

/** A Response factory — a body can only be read once. */
const standings = (series: string) => () =>
	Promise.resolve(
		new Response(
			JSON.stringify({ series, division: 'open', items: [], total: 0, limit: 500, offset: 0 })
		)
	);

describe('loadRankingStandings', () => {
	it('fetches the requested series', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(standings('ranking-women'));

		await loadRankingStandings('ranking-women');

		expect(String(fetchSpy.mock.calls[0]![0])).toContain('series=ranking-women');
	});

	it('serves a repeat call from cache', async () => {
		// The point of the cache: expanding a row re-reads the same standings the
		// table was built from.
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(standings('ranking-open'));

		await loadRankingStandings('ranking-open');
		await loadRankingStandings('ranking-open');

		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('caches each series separately', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(standings('any'));

		await loadRankingStandings('ranking-open');
		await loadRankingStandings('ranking-women');

		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it('refetches once the TTL has passed', async () => {
		vi.useFakeTimers();
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(standings('ranking-open'));

		await loadRankingStandings('ranking-open');
		vi.advanceTimersByTime(5 * 60 * 1000 + 1);
		await loadRankingStandings('ranking-open');

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});

	it('shares one request between concurrent callers', async () => {
		// The table and an immediate expand can ask at the same time.
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(standings('ranking-open'));

		await Promise.all([loadRankingStandings('ranking-open'), loadRankingStandings('ranking-open')]);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('does not cache a failure, and retries on the next call', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementationOnce(() => Promise.reject(new Error('offline')))
			.mockImplementation(standings('ranking-open'));

		await expect(loadRankingStandings('ranking-open')).rejects.toThrow();
		await expect(loadRankingStandings('ranking-open')).resolves.toMatchObject({
			series: 'ranking-open'
		});
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});
