import * as v from 'valibot';
import { form } from '$app/server';
import { invalid, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { account, events, user, verification } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSignedInRequest } from '#lib/server/authz';
import { auth } from '#lib/server/auth';
import { releaseEventPictures } from '#lib/server/eventForm';

export const deleteAccount = form(
	v.object({ _password: v.pipe(v.string(), v.minLength(1, 'Enter your password.')) }),
	async ({ _password: password }, issue) => {
		const signedIn = requireSignedInRequest();

		// Better Auth's configured verifier, so legacy bcrypt hashes still pass.
		const [credential] = await db
			.select({ hash: account.password })
			.from(account)
			.where(and(eq(account.userId, signedIn.id), eq(account.providerId, 'credential')))
			.limit(1);
		const { password: checker } = await auth.$context;
		const ok = credential?.hash ? await checker.verify({ hash: credential.hash, password }) : false;
		if (!ok) invalid(issue._password('Incorrect password.'));

		// Events created by this user go first — events.userId has no cascade.
		const ownedEvents = await db
			.select({ id: events.id, picture: events.picture })
			.from(events)
			.where(eq(events.userId, signedIn.id));
		await db.delete(events).where(eq(events.userId, signedIn.id));
		// Release after all owned events are gone, including ones sharing a picture.
		await releaseEventPictures(ownedEvents);
		// Verification tokens are keyed by email, not by user id.
		await db.delete(verification).where(eq(verification.identifier, signedIn.email));
		// Deleting the user cascades to session, account and event_user.
		await db.delete(user).where(eq(user.id, signedIn.id));

		redirect(302, resolve('/'));
	}
);
