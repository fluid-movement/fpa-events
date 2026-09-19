/**
 * Shared types and defaults for the rankings page.
 *
 * These live outside `data.remote.ts` because SvelteKit requires every export
 * from a `.remote.ts` file to be a remote function — exporting a constant or a
 * type from there fails at runtime, not at typecheck.
 */

/**
 * An external-service outage is an expected state here, not an exception.
 *
 * `<svelte:boundary>` does not catch errors thrown from a remote function
 * during SSR — the request 500s before the `failed` snippet is ever reached —
 * so unavailability is modelled as data the page can render.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** Row shape returned to the client, trimmed from the API's fuller payload. */
export interface RankingRow {
	rank: number;
	playerId: string;
	fullName: string;
	points: number;
	/** Scoring events behind the total. Drives the expander; the detail is lazy. */
	resultsCount: number;
}

/**
 * One scoring event in an expanded player row.
 *
 * Fetched on demand rather than shipped with the table: carrying the ids needed
 * for the event link on all ~350 players grew the standings payload from 112 KB
 * to 202 KB, and almost none of it is ever expanded.
 */
export interface ScoringResult {
	resultId: string;
	/** Null upstream sometimes; without it there is nothing to link to. */
	eventId: string | null;
	eventName: string;
	division: string;
	/** Ranking points earned. Not the raw judged score. */
	points: number;
	/** Finish in the deepest round reached. Null when no placement matched. */
	place: number | null;
	roundName: string | null;
	teammates: Array<{ id: string; fullName: string; unknown: boolean }>;
}

export interface RatingRow {
	rank: number;
	playerId: string;
	fullName: string;
	rating: number;
	matchCount: number;
	peakRating: number | null;
	peakRatingDate: string | null;
}

export interface SeriesOption {
	series: string;
	division: string;
	playerCount: number;
}

export const DEFAULT_RANKING_SERIES = 'ranking-open';
export const DEFAULT_RATING_SERIES = 'rating-open';

/**
 * Ratings cover 2265 players, most with too few matches for the number to mean
 * anything. A floor of 50 cuts that to ~746 and makes the leaderboard honest.
 */
export const DEFAULT_MIN_MATCH_COUNT = 50;
