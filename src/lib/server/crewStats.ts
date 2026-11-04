import { count, eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { crewMembers, events } from '#lib/server/db/schema';
import { listEventsWithAttendeeCount, splitEventsByEndDate } from '#lib/server/utils/events';
import { biggestJam, busiestJamMonth, bucketJamMonths, yearsOfJams } from '#lib/utils/crewStats';
import { formatMonth } from '#lib/utils/dates';

/** Two queries regardless of event count; RSVPs count attending seats, not unique people. */
export async function getCrewStats(crewId: string, cityId: number, now = new Date()) {
	const [members, cityEvents] = await Promise.all([
		db.select({ total: count() }).from(crewMembers).where(eq(crewMembers.crewId, crewId)),
		listEventsWithAttendeeCount(eq(events.cityId, cityId))
	]);
	const { past, upcoming } = splitEventsByEndDate(cityEvents, now);
	const month = busiestJamMonth(bucketJamMonths(cityEvents));
	const biggest = biggestJam(cityEvents);
	return {
		members: members[0].total,
		pastEvents: past.length,
		upcomingEvents: upcoming.length,
		totalRsvps: cityEvents.reduce((total, event) => total + event.attendeeCount, 0),
		yearsOfJams: yearsOfJams(cityEvents, now),
		busiestMonth: month === null ? null : formatMonth(new Date(2000, month, 1)),
		biggestJam: biggest ? { name: biggest.name, attendees: biggest.attendeeCount } : null
	};
}

export type CrewStats = Awaited<ReturnType<typeof getCrewStats>>;
