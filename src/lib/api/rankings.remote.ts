import * as v from 'valibot';
import { query } from '$app/server';
import { fpaApiGet, FpaApiError } from '$lib/server/fpa-api/client';
import { loadRankingStandings } from '$lib/server/fpa-api/rankingIndex';
import type { PlayerProfile, RatingStandings, SeriesRef } from '$lib/server/fpa-api/types';
import { joinScoringResults } from '$lib/rankings/breakdown';
import { collapsePlacements } from '$lib/results/career';
import {
	DEFAULT_MIN_MATCH_COUNT,
	DEFAULT_RANKING_SERIES,
	DEFAULT_RATING_SERIES,
	type ApiResult,
	type RankingRow,
	type RatingRow,
	type ScoringResult,
	type SeriesOption
} from '$lib/rankings/types';

/**
 * Rankings data, fetched from fpa-api server-side.
 *
 * fpa-api serves everything from an in-memory index, so these calls are fast
 * (~150 ms). Its data refreshes hourly, so a little staleness is expected and
 * harmless.
 *
 * The standings themselves are cached in `$lib/server/fpa-api/rankingIndex`
 * because expanding a row reads the same response again, and every expand on a
 * page would otherwise refetch all ~350 players.
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

			const data = await loadRankingStandings(series);

			// The breakdown is dropped entirely rather than trimmed: carrying the
			// ids an event link needs grew the response from 112 KB to 202 KB, and
			// nothing renders it until a row is expanded. Expanding fetches it
			// through `getScoringResults` instead.
			const rows: RankingRow[] = data.items.map((entry) => ({
				rank: entry.rank,
				playerId: entry.playerId,
				fullName: entry.fullName,
				points: entry.points,
				resultsCount: entry.resultsCount
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

/**
 * The scoring events behind one player's ranking total, with who they played
 * with and where they finished.
 *
 * Called when a row is expanded, not with the table. Two upstream reads, one of
 * which is cached across every expand on the page:
 *
 *  - the standings, for which results earned points and how many;
 *  - the player profile, for teammates and placings.
 *
 * `resultId` joins them — see `$lib/rankings/breakdown`.
 */
export const getScoringResults = query(
	v.object({ playerId: v.string(), series: v.optional(v.string()) }),
	async ({ playerId, series: requestedSeries }): Promise<ApiResult<ScoringResult[]>> =>
		attempt(async () => {
			const series = await resolveSeries(requestedSeries, 'rankings');

			const [standings, profile] = await Promise.all([
				loadRankingStandings(series),
				fpaApiGet<PlayerProfile>(`/players/${encodeURIComponent(playerId)}`)
			]);

			// An id that is not in this series has no scoring events to show. That
			// is an empty list, not an error — the row simply says so.
			const entry = standings.items.find((item) => item.playerId === playerId);
			if (!entry) return [];

			return joinScoringResults(entry.breakdown, collapsePlacements(profile.placements));
		})
);
