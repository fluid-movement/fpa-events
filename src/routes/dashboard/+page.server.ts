import { requireSignedIn } from '$lib/server/authz';
import { attendingEvents, organizingEvents } from '$lib/server/utils/events';
import { ensureCalendarToken } from '$lib/server/utils/calendar';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const signedIn = requireSignedIn(locals);

	const [attending, organizing, calendarToken] = await Promise.all([
		attendingEvents(signedIn.id),
		organizingEvents(signedIn.id),
		ensureCalendarToken(signedIn.id)
	]);

	return {
		attending: { ...attending, calendarToken },
		organizing
	};
}) satisfies PageServerLoad;
