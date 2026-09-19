import * as v from 'valibot';
import { query } from '$app/server';
import { fpaApiGet, FpaApiError } from '$lib/server/fpa-api/client';
import type { PlayerProfile } from '$lib/server/fpa-api/types';
import type { ApiResult } from '$lib/rankings/types';
import { collapsePlacements } from '$lib/results/career';
import type { PlayerProfileView } from '$lib/results/types';

/**
 * Player profiles from fpa-api.
 *
 * See `results.remote.ts` for why an outage comes back as data rather than a
 * throw. `GET /players/{id}` also accepts an alias GUID and resolves it to the
 * canonical player, so a link built from an older result still lands correctly.
 */

async function attempt<T>(fn: () => Promise<T>): Promise<ApiResult<T>> {
	try {
		return { ok: true, data: await fn() };
	} catch (error) {
		if (error instanceof FpaApiError) {
			console.warn(`[players] ${error.message}`);
			return { ok: false, message: error.message };
		}
		throw error;
	}
}

export const getPlayerProfile = query(
	v.string(),
	async (playerId): Promise<ApiResult<PlayerProfileView>> =>
		attempt(async () => {
			const profile = await fpaApiGet<PlayerProfile>(`/players/${encodeURIComponent(playerId)}`);

			return {
				// The canonical id, which may differ from the one asked for.
				id: profile.player.id,
				fullName: profile.player.fullName,
				country: profile.player.country,
				stats: {
					eventCount: profile.stats.eventCount,
					wins: profile.stats.wins,
					podiums: profile.stats.podiums,
					firstEventDate: profile.stats.firstEventDate,
					lastEventDate: profile.stats.lastEventDate
				},
				rankings: profile.rankings,
				ratings: profile.ratings,
				// Collapsed here rather than in the browser: an active player has
				// ~130 placements across ~80 event-and-division finishes, and the
				// rounds we drop are never rendered.
				career: collapsePlacements(profile.placements)
			};
		})
);
