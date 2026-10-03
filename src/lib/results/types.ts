import type {
	DivisionResult,
	PlayerRanking,
	PlayerRating,
	TeamMember
} from '#lib/server/fpa-api/types';

/**
 * Shared types and defaults for the results pages.
 *
 * These live outside the `.remote.ts` files because SvelteKit requires every
 * export from one to be a remote function — the same constraint that produced
 * `#lib/rankings/types.ts`. `ApiResult` is reused from there rather than
 * redefined; an fpa-api outage is modelled identically on both features.
 */

/** Events per page in the results list. */
export const PAGE_SIZE = 50;

/** Shown when a player GUID is missing from the upstream directory. */
export const UNKNOWN_PLAYER_LABEL = 'Unknown Player';

/** One row in the results list. Trimmed from the API's fuller event summary. */
export interface ResultEventRow {
	id: string;
	name: string;
	startDate: string | null;
	endDate: string | null;
	divisions: string[];
	resultCount: number;
}

export interface ResultEventsView {
	rows: ResultEventRow[];
	/** Events matching the filter, before pagination. */
	total: number;
	/** 1-based. Clamped server-side, so it is always a page that exists. */
	page: number;
	pageCount: number;
	/** Dropdown options, derived from the whole index rather than this page. */
	facets: { years: number[]; divisions: string[] };
}

export interface EventResultsView {
	id: string;
	name: string;
	startDate: string | null;
	endDate: string | null;
	/** One per division, in the order the API returns them. */
	results: DivisionResult[];
}

/**
 * One line of a player's career: their finish in a single event and division.
 *
 * The API returns a placement per round played, so a player who reached the
 * final of one division has several. These are collapsed to the deepest round
 * reached — round 1 is the final — which is what "how did they do" means.
 */
export interface CareerEntry {
	/** Identifies one event-and-division result. The join key to a ranking breakdown. */
	resultId: string;
	eventId: string;
	eventName: string;
	eventDate: string | null;
	division: string;
	/** Label for the deepest round reached, e.g. "Finals". */
	roundName: string;
	place: number | null;
	teammates: TeamMember[];
}

export interface PlayerProfileView {
	id: string;
	fullName: string;
	country: string | null;
	stats: {
		eventCount: number;
		wins: number;
		podiums: number;
		firstEventDate: string | null;
		lastEventDate: string | null;
	};
	rankings: PlayerRanking[];
	ratings: PlayerRating[];
	career: CareerEntry[];
}
