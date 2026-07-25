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
