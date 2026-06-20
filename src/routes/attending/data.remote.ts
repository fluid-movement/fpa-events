import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { regenerateCalendarToken } from '$lib/server/utils/calendar';

export const regenerateToken = form(v.object({}), async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(302, resolve('/sign-in'));
	return { calendarToken: await regenerateCalendarToken(locals.user.id) };
});
