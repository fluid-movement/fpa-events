import * as v from 'valibot';
import { form } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { events, user, verification } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireSignedInRequest } from '#lib/server/authz';

export const deleteAccount = form(v.object({}), async () => {
	const signedIn = requireSignedInRequest();

	// Events created by this user go first — events.userId has no cascade.
	await db.delete(events).where(eq(events.userId, signedIn.id));
	// Verification tokens are keyed by email, not by user id.
	await db.delete(verification).where(eq(verification.identifier, signedIn.email));
	// Deleting the user cascades to session, account and event_user.
	await db.delete(user).where(eq(user.id, signedIn.id));

	redirect(302, resolve('/'));
});
