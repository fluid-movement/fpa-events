import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { events, user, verification } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const deleteAccount = form(v.object({}), async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(302, resolve('/sign-in'));

	const userId = locals.user.id;
	const userEmail = locals.user.email;

	// Delete events created by this user first (no cascade on events.userId)
	await db.delete(events).where(eq(events.userId, userId));

	// Delete verification tokens tied to this user's email
	await db.delete(verification).where(eq(verification.identifier, userEmail));

	// Delete the user — cascades: session, account, event_user
	await db.delete(user).where(eq(user.id, userId));

	redirect(302, resolve('/'));
});
