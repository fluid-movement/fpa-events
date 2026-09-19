import * as v from 'valibot';
import { form, query } from '$app/server';
import { db } from '#lib/server/db';
import { user } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireSignedInRequest } from '#lib/server/authz';

/**
 * Read straight from the database rather than `locals.user`: Better Auth builds
 * that object from its own schema and `showAttendance` is not among its
 * `additionalFields`, so it would be absent (the same reason `role` is looked up
 * separately in `hooks.server.ts`).
 */
export const getPrivacySettings = query(async () => {
	const signedIn = requireSignedInRequest();

	const [row] = await db
		.select({ showAttendance: user.showAttendance })
		.from(user)
		.where(eq(user.id, signedIn.id))
		.limit(1);

	return { showAttendance: row?.showAttendance ?? true };
});

export const setShowAttendance = form(
	// Sent as an explicit 'true'/'false' string. A bare checkbox would submit
	// nothing when off, making "switched off" indistinguishable from "absent".
	v.object({ showAttendance: v.picklist(['true', 'false']) }),
	async (data) => {
		const signedIn = requireSignedInRequest();

		await db
			.update(user)
			.set({ showAttendance: data.showAttendance === 'true' })
			.where(eq(user.id, signedIn.id));

		await getPrivacySettings().refresh();
	}
);
