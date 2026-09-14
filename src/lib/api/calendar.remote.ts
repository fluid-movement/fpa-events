import * as v from 'valibot';
import { form } from '$app/server';
import { requireSignedInRequest } from '$lib/server/authz';
import { regenerateCalendarToken } from '$lib/server/utils/calendar';

// Shared rather than route-local: the dashboard and the attending page both show
// the same calendar-feed panel, and duplicating this gave them two endpoints that
// had to be kept in step by hand.
export const regenerateToken = form(v.object({}), async () => {
	const user = requireSignedInRequest();
	return { calendarToken: await regenerateCalendarToken(user.id) };
});
