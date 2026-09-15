import * as v from 'valibot';
import { query } from '$app/server';
import { fpaApiGet, FpaApiError } from '$lib/server/fpa-api/client';
import type { RankingStandings, RatingStandings, SeriesRef } from '$lib/server/fpa-api/types';
import {
	BREAKDOWN_LIMIT,
	DEFAULT_MIN_MATCH_COUNT,
	DEFAULT_RANKING_SERIES,
	DEFAULT_RATING_SERIES,
	type ApiResult,
	type RankingRow,
	type RatingRow,
	type SeriesOption
} from '$lib/rankings/types';

/**
 * Rankings data, fetched from fpa-api server-side.
 *
 * fpa-api serves everything from an in-memory index, so these calls are fast
 * (~150 ms) and need no caching layer here. Its data refreshes hourly, so a
 * little staleness is expected and harmless.
 *
 * Two constraints shape this file:
 *  - SvelteKit requires every export from a `.remote.ts` file to be a remote
 *    function, so shared constants and types live in `$lib/rankings/types`.
 *  - Errors thrown here during SSR are NOT caught by `<svelte:boundary>`; the
 *    request 500s instead. Since fpa-api is an external service that can be
 *    down, every query returns an `ApiResult` rather than throwing.
 */

/**
 * The API caps `limit` at 500. Every rating threshold below 100+ matches more
 * players than that (2265 unfiltered), so a list can be truncated — callers
 * must compare `rows.length` against `total` rather than assuming they match.
 */
const API_ROW_LIMIT = 500;

/** Run a fetch, converting an expected API outage into a renderable result. */
async function attempt<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
	try {
		return { ok: true, data: await fn() };
	} catch (error) {
		if (error instanceof FpaApiError) {
			console.warn(`[rankings] ${error.message}`);
			return { ok: false, message: error.message };
		}
		// Anything else is a genuine bug — let it surface.
		throw error;
	}
}

export interface SeriesLists {
	rankings: SeriesOption[];
	ratings: SeriesOption[];
}

/** Available ranking and rating series, for the division switcher. */
export const getSeries = query(async (): Promise<ApiResult<SeriesLists>> =>
	attempt(async () => {
		const [rankings, ratings] = await Promise.all([
			fpaApiGet<{ series: SeriesRef[] }>('/rankings/series'),
			fpaApiGet<{ series: SeriesRef[] }>('/ratings/series')
		]);
		return { rankings: rankings.series, ratings: ratings.series };
	})
);

/**
 * Resolve a series name from the URL against what the API actually offers,
 * rather than forwarding arbitrary input and turning a stale link into an
 * upstream 404.
 */
async function resolveSeries(
	requested: string | undefined,
	kind: 'rankings' | 'ratings'
): Promise<string> {
	const fallback = kind === 'rankings' ? DEFAULT_RANKING_SERIES : DEFAULT_RATING_SERIES;
	if (!requested) return fallback;

	const available = await getSeries();
	if (!available.ok) return fallback;
	return available.data[kind].some((s) => s.series === requested) ? requested : fallback;
}

export interface RankingStandingsView {
	series: string;
	division: string;
	rows: RankingRow[];
	/** Matching players upstream. May exceed rows.length — see API_ROW_LIMIT. */
	total: number;
}

export const getRankings = query(
	v.optional(v.string()),
	async (requestedSeries): Promise<ApiResult<RankingStandingsView>> =>
		attempt(async () => {
			const series = await resolveSeries(requestedSeries, 'rankings');

			// The largest ranking series is 341 players, so one call covers it.
			const data = await fpaApiGet<RankingStandings>(
				`/rankings?series=${encodeURIComponent(series)}&limit=${API_ROW_LIMIT}`
			);

			// Trim here rather than in the browser: the raw response is ~261 KB
			// because every entry carries its full breakdown, including ids we
			// never use without a player drill-down.
			const rows: RankingRow[] = data.items.map((entry) => ({
				rank: entry.rank,
				playerId: entry.playerId,
				fullName: entry.fullName,
				points: entry.points,
				resultsCount: entry.resultsCount,
				breakdown: entry.breakdown.slice(0, BREAKDOWN_LIMIT).map((b) => ({
					eventName: b.eventName ?? 'Unknown event',
					division: b.division ?? 'Unknown division',
					points: b.points
				}))
			}));

			return { series: data.series, division: data.division, rows, total: data.total };
		})
);

export interface RatingStandingsView {
	series: string;
	division: string;
	rows: RatingRow[];
	/** Matching players upstream. May exceed rows.length — see API_ROW_LIMIT. */
	total: number;
}

export const getRatings = query(
	v.optional(
		v.object({
			series: v.optional(v.string()),
			minMatchCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0)))
		})
	),
	async (args): Promise<ApiResult<RatingStandingsView>> =>
		attempt(async () => {
			const series = await resolveSeries(args?.series, 'ratings');
			const minMatchCount = args?.minMatchCount ?? DEFAULT_MIN_MATCH_COUNT;

			const data = await fpaApiGet<RatingStandings>(
				`/ratings?series=${encodeURIComponent(series)}` +
					`&minMatchCount=${minMatchCount}&limit=${API_ROW_LIMIT}`
			);

			const rows: RatingRow[] = data.items.map((entry) => ({
				rank: entry.rank,
				playerId: entry.playerId,
				fullName: entry.fullName,
				rating: entry.rating,
				matchCount: entry.matchCount,
				peakRating: entry.peakRating,
				peakRatingDate: entry.peakRatingDate
			}));

			return { series: data.series, division: data.division, rows, total: data.total };
		})
);
