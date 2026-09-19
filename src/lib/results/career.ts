import type { PlayerPlacement } from '$lib/server/fpa-api/types';
import type { CareerEntry } from './types';

/**
 * Collapse a player's raw placements into one line per event and division.
 *
 * `GET /players/{id}` returns a placement for every round a player took part
 * in, so a pair that played quarters, semis and the final of one division
 * appears three times. Listing all of them reads as three separate results for
 * the same event. What someone means by "how did they do" is their finish in
 * the deepest round they reached — and rounds count backwards, so that is the
 * LOWEST round number, with 1 being the final.
 *
 * Ordered newest first; entries without a date sort last.
 */
export function collapsePlacements(placements: PlayerPlacement[]): CareerEntry[] {
	const deepest = new Map<string, PlayerPlacement>();

	for (const placement of placements) {
		// Event ids are GUIDs, so "::" cannot occur in the left half and the key
		// is unambiguous.
		const key = `${placement.eventId}::${placement.division}`;
		const current = deepest.get(key);
		if (!current || placement.round < current.round) deepest.set(key, placement);
	}

	return [...deepest.values()]
		.map((p): CareerEntry => ({
			resultId: p.resultId,
			eventId: p.eventId,
			eventName: p.eventName,
			eventDate: p.eventDate,
			division: p.division,
			roundName: p.roundName,
			place: p.place,
			teammates: p.teammates
		}))
		.sort((a, b) => {
			// Compare on a padded key rather than the raw string: the API mixes
			// padded and unpadded dates, so `2020-2-8` would otherwise sort below
			// `2020-10-01`.
			const ak = sortKey(a.eventDate);
			const bk = sortKey(b.eventDate);
			if (ak === bk) {
				return a.eventName.localeCompare(b.eventName) || a.division.localeCompare(b.division);
			}
			if (ak === null) return 1;
			if (bk === null) return -1;
			return bk.localeCompare(ak);
		});
}

function sortKey(value: string | null): string | null {
	if (!value) return null;
	const parts = value.split('-');
	if (parts.length !== 3) return null;
	const [y, m, d] = parts;
	return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
