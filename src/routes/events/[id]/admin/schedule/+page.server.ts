import { db } from '#lib/server/db';
import { events, schedules, eventLocations } from '#lib/server/db/schema';
import { autocomplete } from '#lib/geocoding';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * How long the map-centre fallback may hold up the tab. The picker works
 * without a centre, so a slow Photon is worth giving up on, not waiting for.
 */
const GEOCODE_TIMEOUT_MS = 2000;

/**
 * Access is already guarded by the layout load.
 *
 * The geocoding fallback below lives here rather than in the layout on purpose:
 * it is an uncached HTTP call to an external service, and only the venue picker
 * on this tab uses the coordinates. Previously it ran on every tab.
 */
export const load = (async ({ params }) => {
	if (!params.id) error(404, 'Not found');

	const [row] = await db
		.select({ event: events, location: eventLocations })
		.from(events)
		.leftJoin(eventLocations, eq(events.eventLocationId, eventLocations.id))
		.where(eq(events.id, params.id));
	if (!row) error(404, 'Not found');

	const eventSchedules = await db
		.select()
		.from(schedules)
		.where(eq(schedules.eventId, params.id))
		.orderBy(schedules.startDate);

	let eventLat = row.location?.latitude ?? null;
	let eventLng = row.location?.longitude ?? null;

	if ((eventLat === null || eventLng === null) && row.event.location) {
		const results = await autocomplete(
			row.event.location,
			1,
			AbortSignal.timeout(GEOCODE_TIMEOUT_MS)
		).catch(() => []);
		if (results[0]) {
			eventLat = results[0].lat;
			eventLng = results[0].lng;
		}
	}

	return { schedules: eventSchedules, eventLat, eventLng };
}) satisfies PageServerLoad;
