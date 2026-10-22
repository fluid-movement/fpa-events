import type {
	EventDetail,
	PaginatedEvents,
	PlayerProfile,
	RankingStandings,
	RatingStandings,
	SeriesRef
} from './types';

/**
 * Top-level shape guards for fpa-api answers, passed to `fpaApiGet`.
 *
 * They check only what callers dereference without looking (the arrays and
 * objects at the top), so a wrong-shaped answer becomes an `FpaApiError` and
 * the "unavailable" notice rather than a `TypeError` and a 500. Field-level
 * values are rendered as escaped text and are not re-validated here.
 */

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isPage = (
	value: unknown
): value is Record<string, unknown> & { items: unknown[]; total: number } =>
	isObject(value) && Array.isArray(value.items) && typeof value.total === 'number';

export const isPaginatedEvents = (value: unknown): value is PaginatedEvents =>
	isPage(value) &&
	value.items.every((item) => isObject(item) && typeof item.resultCount === 'number');

export const isRankingStandings = (value: unknown): value is RankingStandings =>
	isPage(value) &&
	typeof value.series === 'string' &&
	value.items.every((item) => isObject(item) && Array.isArray(item.breakdown));

export const isRatingStandings = (value: unknown): value is RatingStandings =>
	isPage(value) && typeof value.series === 'string' && value.items.every(isObject);

export const isSeriesList = (value: unknown): value is { series: SeriesRef[] } =>
	isObject(value) && Array.isArray(value.series) && value.series.every(isObject);

export const isPlayerProfile = (value: unknown): value is PlayerProfile =>
	isObject(value) &&
	isObject(value.player) &&
	isObject(value.stats) &&
	Array.isArray(value.placements) &&
	value.placements.every(isObject) &&
	Array.isArray(value.rankings) &&
	Array.isArray(value.ratings);

export const isEventDetail = (value: unknown): value is EventDetail =>
	isObject(value) &&
	isObject(value.event) &&
	Array.isArray(value.results) &&
	value.results.every((result) => isObject(result) && Array.isArray(result.rounds));
