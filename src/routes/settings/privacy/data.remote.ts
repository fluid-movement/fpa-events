import * as v from 'valibot';
import { form, query, getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Read straight from the database rather than `locals.user`: Better Auth builds
 * that object from its own schema and `showAttendance` is not among its
 * `additionalFields`, so it would be absent (the same reason `role` is looked up
 * separately in `hooks.server.ts`).
 */
export const getPrivacySettings = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(302, resolve('/sign-in'));

	const [row] = await db
		.select({ showAttendance: user.showAttendance })
		.from(user)
		.where(eq(user.id, locals.user.id))
		.limit(1);

	return { showAttendance: row?.showAttendance ?? true };
});

export const setShowAttendance = form(
	// Sent as an explicit 'true'/'false' string. A bare checkbox would submit
	// nothing when off, making "switched off" indistinguishable from "absent".
	v.object({ showAttendance: v.picklist(['true', 'false']) }),
	async (data) => {
		const { locals } = getRequestEvent();
		if (!locals.user) redirect(302, resolve('/sign-in'));

		await db
			.update(user)
			.set({ showAttendance: data.showAttendance === 'true' })
			.where(eq(user.id, locals.user.id));

		await getPrivacySettings().refresh();
	}
);
