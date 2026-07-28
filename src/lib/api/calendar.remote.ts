import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { regenerateCalendarToken } from '$lib/server/utils/calendar';

// Shared rather than route-local: the dashboard and the attending page both show
// the same calendar-feed panel, and duplicating this gave them two endpoints that
// had to be kept in step by hand.
export const regenerateToken = form(v.object({}), async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(302, resolve('/sign-in'));
	return { calendarToken: await regenerateCalendarToken(locals.user.id) };
});
