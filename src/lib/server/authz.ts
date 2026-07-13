import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

type SessionUser = NonNullable<App.Locals['user']>;

/**
 * Require an authenticated user for the current request. Returns the user and their role.
 * Throws `Error('Unauthorized')` when no session is present.
 *
 * Intended for use inside remote functions (`form()` / `query()` from `$app/server`),
 * which throw errors rather than redirecting.
 */
export function requireUser(): { user: SessionUser; role: 'user' | 'admin' } {
	const { locals } = getRequestEvent();
	if (!locals.user) throw new Error('Unauthorized');
	return { user: locals.user, role: locals.role ?? 'user' };
}

/** Whether the given user may manage (edit/administer) the event: owner or site admin. */
export function isEventManager(
	event: { userId: string },
	userId: string,
	role: 'user' | 'admin' | undefined
): boolean {
	return event.userId === userId || role === 'admin';
}

/**
 * Require that the current user may manage the given event (owner or admin).
 * Loads and returns the event row.
 *
 * Throws `Error('Unauthorized')` (not logged in), `Error('Event not found')` (no such
 * event), or `Error('Forbidden')` (logged in but not a manager).
 */
export async function requireEventManager(eventId: string) {
	const { user, role } = requireUser();
	const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
	if (!event) throw new Error('Event not found');
	if (!isEventManager(event, user.id, role)) throw new Error('Forbidden');
	return event;
}
