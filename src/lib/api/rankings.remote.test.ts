// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// `query` is the only thing the module needs from `$app/server`. Kit checks
// that every export carries remote-function metadata, so the stand-in wraps
// the handler (skipping schema validation) and tags it as a query.
vi.mock('$app/server', () => ({
	query: (...args: unknown[]) => {
		const handler = args[args.length - 1] as (...a: unknown[]) => unknown;
		return Object.assign((...a: unknown[]) => handler(...a), { __: { type: 'query' } });
	}
}));

import { getRankings, getRatings, getScoringResults } from './rankings.remote';
import { resetRankingCache } from '#lib/server/fpa-api/rankingIndex';

const PLAYER_ID = '11111111-1111-4111-8111-111111111111';

const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body)));

/** A fake fpa-api that offers one series of each kind and records every path asked for. */
function fakeApi() {
	const requested: string[] = [];
	vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
		const url = new URL(String(input));
		const path = url.pathname + url.search;
		requested.push(path);
		if (url.pathname === '/rankings/series') {
			return json({ series: [{ series: 'ranking-open', division: 'open' }] });
		}
		if (url.pathname === '/ratings/series') {
			return json({ series: [{ series: 'rating-open', division: 'open' }] });
		}
		if (url.pathname === '/rankings' || url.pathname === '/ratings') {
			return json({
				series: url.searchParams.get('series'),
				division: 'open',
				items: [],
				total: 0,
				limit: 500,
				offset: 0
			});
		}
		if (url.pathname.startsWith('/players/')) {
			return json({
				player: { id: PLAYER_ID },
				stats: {},
				placements: [],
				rankings: [],
				ratings: []
			});
		}
		return Promise.resolve(new Response('not found', { status: 404 }));
	});
	return requested;
}

beforeEach(() => resetRankingCache());
afterEach(() => vi.restoreAllMocks());

/**
 * The series name arrives from the URL. It is checked against what the API
 * offers before it becomes a cache key or an upstream query, so a caller
 * cannot grow the per-series cache or probe upstream with arbitrary names.
 */
describe('unknown series', () => {
	const UNKNOWN = 'ranking-does-not-exist';

	it('getRankings falls back to the default and never asks upstream for the unknown name', async () => {
		const requested = fakeApi();

		const result = await getRankings(UNKNOWN);

		expect(result.ok && result.data.series).toBe('ranking-open');
		expect(requested.join('\n')).not.toContain(UNKNOWN);
		expect(requested).toContain('/rankings?series=ranking-open&limit=500');
	});

	it('getScoringResults falls back to the default and never asks upstream for the unknown name', async () => {
		const requested = fakeApi();

		const result = await getScoringResults({ playerId: PLAYER_ID, series: UNKNOWN });

		expect(result.ok).toBe(true);
		expect(requested.join('\n')).not.toContain(UNKNOWN);
		expect(requested).toContain('/rankings?series=ranking-open&limit=500');
	});

	it('getRatings falls back to the default and never asks upstream for the unknown name', async () => {
		const requested = fakeApi();

		const result = await getRatings({ series: UNKNOWN });

		expect(result.ok && result.data.series).toBe('rating-open');
		expect(requested.join('\n')).not.toContain(UNKNOWN);
	});

	it('a ranking series name is not accepted as a rating series', async () => {
		const requested = fakeApi();

		await getRatings({ series: 'ranking-open' });

		expect(requested.join('\n')).not.toContain('series=ranking-open');
	});
});
