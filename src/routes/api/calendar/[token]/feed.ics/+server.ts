import { db } from '#lib/server/db';
import { user, events, eventUser } from '#lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { buildCalendarFeed } from '#lib/server/calendar-feed';
import { isCalendarToken } from '#lib/server/validation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	// Not a token we could have issued: the same 404, without a query.
	if (!isCalendarToken(params.token)) return new Response('Not found', { status: 404 });

	const [owner] = await db
		.select({ id: user.id, name: user.name })
		.from(user)
		.where(eq(user.calendarToken, params.token));

	if (!owner) {
		return new Response('Not found', { status: 404 });
	}

	const rows = await db
		.select({ event: events })
		.from(eventUser)
		.innerJoin(events, eq(eventUser.eventId, events.id))
		.where(and(eq(eventUser.userId, owner.id), eq(eventUser.status, 'attending')));

	return new Response(
		buildCalendarFeed(
			owner.name,
			rows.map(({ event }) => event),
			url.origin
		),
		{
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Content-Disposition': 'inline; filename="fpa-events.ics"',
				'Cache-Control': 'max-age=3600, private'
			}
		}
	);
};
