import { auth } from '#lib/server/auth';
import { db } from '#lib/server/db';
import { user } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { type Handle, type HandleServerError } from '@sveltejs/kit/hooks';
import { describeServerError } from '#lib/server/errors';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		// Looked up separately because `role` is not one of Better Auth's
		// `additionalFields`, so it never reaches `session.user`.
		const [record] = await db
			.select({ role: user.role })
			.from(user)
			.where(eq(user.id, session.user.id));
		event.locals.role = record?.role ?? 'user';
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

/**
 * Unexpected errors only: each gets a short reference that is logged with the
 * method, route and user, and shown on the error page so a user can quote it.
 * Errors thrown with `error()` keep Kit's defaults and are not logged.
 */
export const handleError: HandleServerError = ({ kind, error, event }) => {
	const report = describeServerError({
		kind,
		error,
		method: event.request.method,
		routeId: event.route.id,
		userId: event.locals.user?.id ?? null
	});
	if (!report) return;

	console.error(report.logLine);
	if (report.stack) console.error(report.stack);
	return { message: 'Internal Error', errorId: report.errorId };
};
