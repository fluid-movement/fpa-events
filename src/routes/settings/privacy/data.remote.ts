import * as v from 'valibot';
import { form, query } from '$app/server';
import { db } from '#lib/server/db';
import { user } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireSignedInRequest } from '#lib/server/authz';

/**
 * Read straight from the database rather than `locals.user`: Better Auth builds
 * that object from its own schema and `showName` is not among its
 * `additionalFields`, so it would be absent (the same reason `role` is looked up
 * separately in `hooks.server.ts`).
 */
export const getPrivacySettings = query(async () => {
	const signedIn = requireSignedInRequest();

	const [row] = await db
		.select({ showName: user.showName })
		.from(user)
		.where(eq(user.id, signedIn.id))
		.limit(1);

	return { showName: row?.showName ?? true };
});

export const setShowName = form(
	// Sent as an explicit 'true'/'false' string. A bare checkbox would submit
	// nothing when off, making "switched off" indistinguishable from "absent".
	v.object({ showName: v.picklist(['true', 'false']) }),
	async (data) => {
		const signedIn = requireSignedInRequest();

		await db
			.update(user)
			.set({ showName: data.showName === 'true' })
			.where(eq(user.id, signedIn.id));

		await getPrivacySettings().refresh();
	}
);
