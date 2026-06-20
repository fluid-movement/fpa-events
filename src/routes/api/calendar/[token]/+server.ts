import { db } from '$lib/server/db';
import { user, events, eventUser } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import ical, { ICalCalendarMethod } from 'ical-generator';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
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

	const cal = ical({
		name: `FPA Events — ${owner.name}`,
		method: ICalCalendarMethod.PUBLISH
	});

	for (const { event } of rows) {
		cal.createEvent({
			id: `${event.id}@fpa-events`,
			start: event.startDate,
			end: event.endDate,
			summary: event.name,
			location: event.location,
			description: event.description.replace(/<[^>]+>/g, '')
		});
	}

	return new Response(cal.toString(), {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'inline; filename="fpa-events.ics"',
			'Cache-Control': 'max-age=3600, private'
		}
	});
};
