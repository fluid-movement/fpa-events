import type { Event } from '$lib/types/event';
import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { sql, lt, desc } from 'drizzle-orm';

export async function getArchiveYears(): Promise<number[]> {
	const yearExpr = sql<number>`EXTRACT(YEAR FROM ${events.startDate})::int`;
	const rows = await db
		.selectDistinct({ year: yearExpr })
		.from(events)
		.where(lt(events.startDate, new Date()))
		.orderBy(desc(yearExpr));
	return rows.map((r) => r.year);
}

export type EventsByMonth<T extends Event = Event> = {
	month: string; // "2024-01"
	label: string; // "January 2024"
	events: T[];
}[];

export function groupEventsByMonth<T extends Event>(
	eventList: T[],
	locale: string = 'en-US'
): EventsByMonth<T> {
	// Group events by month key
	const groupedByMonth = new Map<string, T[]>();

	for (const event of eventList) {
		const date = new Date(event.startDate);
		const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

		if (!groupedByMonth.has(monthKey)) {
			groupedByMonth.set(monthKey, []);
		}
		groupedByMonth.get(monthKey)!.push(event);
	}

	// Convert to sorted array with formatted labels
	return Array.from(groupedByMonth.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, events]) => {
			const [year, monthNum] = month.split('-');
			const date = new Date(parseInt(year), parseInt(monthNum) - 1);
			const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

			return { month, label, events };
		});
}
