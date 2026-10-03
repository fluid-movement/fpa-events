import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '#lib/server/db';
import { events, eventUser } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

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

/**
 * Require a signed-in user inside a `load` function, sending anyone else to the
 * sign-in page. 307 keeps the method, which is what a GET navigation wants.
 */
export function requireSignedIn(locals: App.Locals): SessionUser {
	if (!locals.user) redirect(307, resolve('/sign-in'));
	return locals.user;
}

/**
 * The same guard for a remote function. 302 rather than 307 on purpose: a form
 * POST must land on the sign-in page as a GET, not be replayed against it.
 */
export function requireSignedInRequest(): SessionUser {
	const { locals } = getRequestEvent();
	if (!locals.user) redirect(302, resolve('/sign-in'));
	return locals.user;
}

/**
 * Whether the given user owns the event outright: the creator or a site admin.
 *
 * This is the *owner-level* check, reserved for destructive actions (deleting the
 * event). For everyday management use `canManageEvent`, which also admits
 * co-organizers.
 */
export function isEventManager(
	event: { userId: string },
	userId: string,
	role: 'user' | 'admin' | undefined
): boolean {
	return event.userId === userId || role === 'admin';
}

/** Whether the user holds an accepted co-organizer seat on the event. */
export async function isEventCoOrganizer(eventId: string, userId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: eventUser.id })
		.from(eventUser)
		.where(
			and(
				eq(eventUser.eventId, eventId),
				eq(eventUser.userId, userId),
				eq(eventUser.status, 'organizing')
			)
		)
		.limit(1);
	return !!row;
}

/**
 * Whether the given user may manage the event: owner, site admin, or a
 * co-organizer who accepted a magic-link invite.
 */
export async function canManageEvent(
	event: { id: string; userId: string },
	userId: string,
	role: 'user' | 'admin' | undefined
): Promise<boolean> {
	if (isEventManager(event, userId, role)) return true;
	return isEventCoOrganizer(event.id, userId);
}

/**
 * Load the event and check the current user against it.
 *
 * Throws 401 (not logged in), 404 (no such event) or 403 (logged in but not
 * permitted). These are `error()` rather than bare `Error`s so they carry their
 * status: a plain throw from a remote function reaches the client as a 500
 * "Internal Error", which is both wrong and noisy. Deleting an event is the case
 * that showed it — SvelteKit refreshes the queries still mounted on the manage
 * page, they look up a row that is now gone, and a 500 surfaces as an uncaught
 * error instead of the 404 it is.
 */
async function requireEventAccess(
	eventId: string,
	allow: (
		event: typeof events.$inferSelect,
		userId: string,
		role: 'user' | 'admin'
	) => boolean | Promise<boolean>
) {
	const { user, role } = requireUser();
	const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
	if (!event) error(404, 'Event not found');
	if (!(await allow(event, user.id, role))) error(403, 'Forbidden');
	return event;
}

/**
 * Require that the current user may manage the given event (owner, site admin, or
 * co-organizer). Loads and returns the event row.
 */
export function requireEventManager(eventId: string) {
	return requireEventAccess(eventId, canManageEvent);
}

/**
 * Require that the current user owns the given event (creator or site admin).
 * Use for destructive actions that co-organizers must not perform.
 */
export function requireEventOwner(eventId: string) {
	return requireEventAccess(eventId, isEventManager);
}
