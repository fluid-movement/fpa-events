import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		const [userRecord] = await db
			.select({ role: user.role })
			.from(user)
			.where(eq(user.id, session.user.id));
		event.locals.role = (userRecord?.role as 'user' | 'admin') ?? 'user';
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
