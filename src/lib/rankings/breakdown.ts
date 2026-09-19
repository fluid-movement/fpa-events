import type { RankingBreakdownEntry } from '#lib/server/fpa-api/types';
import type { CareerEntry } from '#lib/results/types';
import type { ScoringResult } from './types';

/**
 * Join a player's ranking breakdown to their career placements.
 *
 * The two come from different endpoints and answer different halves of the
 * question. `/rankings` says which results earned ranking points and how many;
 * `/players/{id}` says who the player was on a team with and where they
 * finished. `resultId` is the shared key — it identifies one event-and-division
 * result, and both sides carry it.
 *
 * Entries with no matching placement are kept, not dropped: the points were
 * really scored, and showing the event without its partners beats hiding a
 * result the ranking is built on.
 */
export function joinScoringResults(
	breakdown: RankingBreakdownEntry[],
	career: CareerEntry[]
): ScoringResult[] {
	const byResult = new Map(career.map((entry) => [entry.resultId, entry]));

	return breakdown.map((entry): ScoringResult => {
		const placement = byResult.get(entry.resultId);

		return {
			resultId: entry.resultId,
			// `eventId` is nullable upstream; without it there is nothing to link to.
			eventId: entry.eventId,
			eventName: entry.eventName ?? 'Unknown event',
			division: entry.division ?? 'Unknown division',
			/** Ranking points, not the raw judged score — those are different numbers. */
			points: entry.points,
			place: placement?.place ?? null,
			roundName: placement?.roundName ?? null,
			teammates: placement?.teammates ?? []
		};
	});
}
