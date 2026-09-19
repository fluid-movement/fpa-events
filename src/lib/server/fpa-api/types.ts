/**
 * Types for the subset of fpa-api this app consumes.
 *
 * Mirrors the service's published `openapi.json`. Deliberately minimal — only
 * the fields the rankings page renders are modelled, so an unrelated change
 * upstream cannot break typechecking here.
 *
 * Note: neither ranking nor rating entries carry a `country`. Showing one would
 * need a second join against `/players`.
 */

export interface SeriesRef {
	series: string;
	division: string;
	playerCount: number;
}

export interface RankingBreakdownEntry {
	resultId: string;
	points: number;
	eventId: string | null;
	eventName: string | null;
	division: string | null;
}

export interface RankingEntry {
	rank: number;
	playerId: string;
	fullName: string;
	points: number;
	resultsCount: number;
	/** Which events produced these points, highest first. */
	breakdown: RankingBreakdownEntry[];
}

export interface RatingEntry {
	rank: number;
	playerId: string;
	fullName: string;
	/** Elo-style strength estimate. Not comparable with ranking points. */
	rating: number;
	/** Head-to-head comparisons behind the rating. Low counts are unreliable. */
	matchCount: number;
	peakRating: number | null;
	peakRatingDate: string | null;
	peakRank: number | null;
	peakRankDate: string | null;
}

export interface Standings<T> {
	series: string;
	division: string;
	items: T[];
	total: number;
	limit: number;
	offset: number;
}

export type RankingStandings = Standings<RankingEntry>;
export type RatingStandings = Standings<RatingEntry>;

/* -------------------------------------------------------------------------- */
/* Events and results                                                         */
/* -------------------------------------------------------------------------- */

export interface EventSummary {
	id: string;
	name: string;
	/** `YYYY-MM-DD`, but NOT reliably zero-padded — see `parseApiDate`. */
	startDate: string | null;
	endDate: string | null;
	/** Normalized divisions that have results. */
	divisions: string[];
	resultCount: number;
}

export interface TeamMember {
	id: string;
	fullName: string;
	/** True when this GUID is absent from the player directory. */
	unknown: boolean;
}

export interface Team {
	/** Finishing position in this pool, 1 is best. The only safe sort key. */
	place: number | null;
	/**
	 * Raw score as recorded. Its meaning depends on the ruleset the event used —
	 * higher is better under FPA2020, lower under SimpleRanking — and the ruleset
	 * is not exposed. Display only; never sort or compare across events.
	 */
	points: number | null;
	players: TeamMember[];
}

export interface Pool {
	/** Pool letter, e.g. "A". */
	name: string;
	/** Ordered by placement. */
	teams: Team[];
}

export interface Round {
	/** 1 is the final, counting backwards. Not contiguous. */
	number: number;
	/** e.g. "Finals", "Semifinals". Label with this, never with `number`. */
	name: string;
	pools: Pool[];
}

export interface DivisionResult {
	id: string;
	eventId: string;
	eventName: string;
	/** Canonical division name. */
	division: string;
	rounds: Round[];
}

export interface EventDetail {
	event: EventSummary;
	results: DivisionResult[];
}

export interface Paginated<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
}

export type PaginatedEvents = Paginated<EventSummary>;

/* -------------------------------------------------------------------------- */
/* Players                                                                    */
/* -------------------------------------------------------------------------- */

export interface Player {
	id: string;
	fullName: string;
	/** 3-letter code, e.g. "GER". */
	country: string | null;
}

export interface PlayerStats {
	eventCount: number;
	placementCount: number;
	wins: number;
	podiums: number;
	firstEventDate: string | null;
	lastEventDate: string | null;
	divisions: string[];
}

export interface PlayerRanking {
	series: string;
	division: string;
	rank: number;
	points: number;
	resultsCount: number;
}

export interface PlayerRating {
	series: string;
	division: string;
	rank: number;
	rating: number;
	/** Always render this beside the rating — it is the sample size. */
	matchCount: number;
	peakRating: number | null;
	peakRatingDate: string | null;
}

/** One team's finish in one round. A player has one of these per round played. */
export interface PlayerPlacement {
	resultId: string;
	eventId: string;
	eventName: string;
	eventDate: string | null;
	division: string;
	round: number;
	roundName: string;
	pool: string;
	place: number | null;
	points: number | null;
	teammates: TeamMember[];
}

export interface PlayerProfile {
	player: Player;
	stats: PlayerStats;
	rankings: PlayerRanking[];
	ratings: PlayerRating[];
	placements: PlayerPlacement[];
}
