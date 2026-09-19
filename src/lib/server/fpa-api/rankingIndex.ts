import { fpaApiGet } from './client';
import type { RankingStandings } from './types';

/**
 * Ranking standings, cached per series.
 *
 * Two callers need the same response: the standings table, and the per-player
 * drill-down that looks up one player's scoring events. Fetching it twice for
 * one expand would be wasteful, and the two could disagree if a refresh landed
 * between them.
 *
 * Five minutes, matching the event index. fpa-api refreshes hourly, so a longer
 * TTL only stacks staleness on top of its own.
 */

/** The largest ranking series is ~350 players, so one call covers it. */
const API_ROW_LIMIT = 500;

const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { data: RankingStandings; loadedAt: number }>();
const inFlight = new Map<string, Promise<RankingStandings>>();

export async function loadRankingStandings(series: string): Promise<RankingStandings> {
	const hit = cache.get(series);
	if (hit && Date.now() - hit.loadedAt < CACHE_TTL_MS) return hit.data;

	let pending = inFlight.get(series);
	if (!pending) {
		pending = fpaApiGet<RankingStandings>(
			`/rankings?series=${encodeURIComponent(series)}&limit=${API_ROW_LIMIT}`
		)
			.then((data) => {
				cache.set(series, { data, loadedAt: Date.now() });
				return data;
			})
			.finally(() => {
				inFlight.delete(series);
			});
		inFlight.set(series, pending);
	}

	// A failure rejects and leaves any previous entry alone, rather than
	// replacing a good cache with an outage.
	return pending;
}

/** Test seam. Not used by the app. */
export function resetRankingCache(): void {
	cache.clear();
	inFlight.clear();
}
