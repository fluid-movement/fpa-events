import type { Event, EventUserStatus } from '#lib/types/event';
import { db } from '#lib/server/db';
import { events, eventUser } from '#lib/server/db/schema';
import { groupBy } from '#lib/utils/collections';
import {
	and,
	asc,
	count,
	desc,
	eq,
	getTableColumns,
	gt,
	inArray,
	lt,
	lte,
	or,
	sql
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/** Years that have at least one event already started, most recent first. */
export async function getArchiveYears(): Promise<number[]> {
	const yearExpr = sql<number>`EXTRACT(YEAR FROM ${events.startDate})::int`;
	const rows = await db
		.selectDistinct({ year: yearExpr })
		.from(events)
		.where(lt(events.startDate, new Date()))
		.orderBy(desc(yearExpr));
	return rows.map((r) => r.year);
}

/**
 * Events matching `where`, each with the number of people attending, oldest
 * first. One grouped query rather than a count per row.
 */
export function listEventsWithAttendeeCount(where: SQL | undefined) {
	return db
		.select({ ...getTableColumns(events), attendeeCount: count(eventUser.id) })
		.from(events)
		.leftJoin(eventUser, and(eq(eventUser.eventId, events.id), eq(eventUser.status, 'attending')))
		.where(where)
		.groupBy(events.id)
		.orderBy(asc(events.startDate));
}

/**
 * Tag each event with the signed-in user's relationship to it, in one extra
 * query. Returns `userStatus: null` throughout for a signed-out visitor.
 */
export async function withUserStatus<T extends { id: string }>(
	rows: T[],
	userId: string | undefined
): Promise<(T & { userStatus: EventUserStatus | null })[]> {
	if (!userId || rows.length === 0) {
		return rows.map((row) => ({ ...row, userStatus: null }));
	}

	const statuses = await db
		.select({ eventId: eventUser.eventId, status: eventUser.status })
		.from(eventUser)
		.where(
			and(
				eq(eventUser.userId, userId),
				inArray(
					eventUser.eventId,
					rows.map((row) => row.id)
				)
			)
		);

	const byEvent = new Map(statuses.map((r) => [r.eventId, r.status as EventUserStatus]));
	return rows.map((row) => ({ ...row, userStatus: byEvent.get(row.id) ?? null }));
}

/**
 * Head-count per event for the organizer-facing pages, in one query.
 *
 * Note this counts every `event_user` row, organizers included — which is what
 * the "N attending" figure on those pages has always shown, and differs from
 * the attendee-only total on the public browse pages.
 */
export async function eventUserCounts(eventIds: string[]): Promise<Map<string, number>> {
	if (eventIds.length === 0) return new Map();

	const rows = await db
		.select({ eventId: eventUser.eventId, total: count() })
		.from(eventUser)
		.where(inArray(eventUser.eventId, eventIds))
		.groupBy(eventUser.eventId);

	return new Map(rows.map((r) => [r.eventId, r.total]));
}

/** Events the user RSVP'd to, split around today. Upcoming ascending, past descending. */
export async function attendingEvents(userId: string) {
	const now = new Date();

	const forWindow = (window: SQL | undefined, order: SQL) =>
		db
			.select({ event: events })
			.from(eventUser)
			.innerJoin(events, eq(eventUser.eventId, events.id))
			.where(and(eq(eventUser.userId, userId), eq(eventUser.status, 'attending'), window))
			.orderBy(order)
			.then((rows) => rows.map((r) => r.event));

	const [upcoming, past] = await Promise.all([
		forWindow(gt(events.startDate, now), asc(events.startDate)),
		forWindow(lte(events.startDate, now), desc(events.startDate))
	]);

	return { upcoming, past };
}

/**
 * Events the user runs — the ones they created plus any they co-organize
 * through an accepted invite — split around today and decorated with head
 * counts. Upcoming ascending, past descending.
 */
export async function organizingEvents(userId: string) {
	const now = new Date();

	// Events the user co-organizes through an accepted magic-link invite. The
	// `or` below still matters: events created before the app started recording
	// an organizing seat for their creator only match on `userId`.
	const coOrganizing = db
		.select({ eventId: eventUser.eventId })
		.from(eventUser)
		.where(and(eq(eventUser.userId, userId), eq(eventUser.status, 'organizing')));

	const all = await db
		.select()
		.from(events)
		.where(or(eq(events.userId, userId), inArray(events.id, coOrganizing)))
		.orderBy(asc(events.startDate));

	const counts = await eventUserCounts(all.map((e) => e.id));
	const decorate = (event: (typeof all)[number]) => ({
		...event,
		attendeeCount: counts.get(event.id) ?? 0,
		isOwner: event.userId === userId
	});

	return {
		upcoming: all.filter((e) => e.startDate >= now).map(decorate),
		past: all
			.filter((e) => e.startDate < now)
			.reverse()
			.map(decorate)
	};
}

export type EventsByMonth<T extends Event = Event> = {
	/** Sort key, "2024-01". */
	month: string;
	/** Heading, "January 2024". */
	label: string;
	events: T[];
}[];

/** Bucket events into chronological month groups for the calendar views. */
export function groupEventsByMonth<T extends Event>(
	eventList: T[],
	locale: string = 'en-US'
): EventsByMonth<T> {
	const byMonth = groupBy(eventList, (event) => {
		const date = new Date(event.startDate);
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
	});

	return [...byMonth.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, events]) => {
			const [year, monthNumber] = month.split('-');
			const label = new Date(Number(year), Number(monthNumber) - 1).toLocaleDateString(locale, {
				month: 'long',
				year: 'numeric'
			});
			return { month, label, events };
		});
}
