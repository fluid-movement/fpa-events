import * as v from 'valibot';
import { form } from '$app/server';
import { invalid, redirect, isHttpError } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { account, events, user, verification } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSignedInRequest } from '#lib/server/authz';
import { auth } from '#lib/server/auth';
import { assertCrewExit, withCrewMembership } from '#lib/server/crew-membership';
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

		// Hold the user and crew locks through deletion, so another admin cannot
		// leave or demote themselves between the check and the cascading delete.
		const ownedEvents = await withCrewMembership(signedIn.id, [], async (tx, membership) => {
			try {
				await assertCrewExit(tx, membership, 'deleteAccount');
			} catch (cause) {
				if (isHttpError(cause, 400)) invalid(issue._password(cause.body.message));
				throw cause;
			}
			const owned = await tx
				.select({ id: events.id, picture: events.picture })
				.from(events)
				.where(eq(events.userId, signedIn.id));
			await tx.delete(events).where(eq(events.userId, signedIn.id));
			await tx.delete(verification).where(eq(verification.identifier, signedIn.email));
			await tx.delete(user).where(eq(user.id, signedIn.id));
			return owned;
		});
		await releaseEventPictures(ownedEvents);

		redirect(302, resolve('/'));
	}
);
