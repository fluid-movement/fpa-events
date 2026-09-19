import { requireSignedIn } from '#lib/server/authz';
import { attendingEvents } from '#lib/server/utils/events';
import { ensureCalendarToken } from '#lib/server/utils/calendar';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const signedIn = requireSignedIn(locals);

	const [attending, calendarToken] = await Promise.all([
		attendingEvents(signedIn.id),
		ensureCalendarToken(signedIn.id)
	]);

	return { ...attending, calendarToken };
}) satisfies PageServerLoad;
