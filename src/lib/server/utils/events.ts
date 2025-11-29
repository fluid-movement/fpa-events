import type { events } from '$lib/server/db/schema';

export type EventsByMonth = {
	month: string; // "2024-01"
	label: string; // "January 2024"
	events: (typeof events.$inferSelect)[];
}[];

/**
 * Groups events by month and returns them sorted chronologically with labels
 * @param eventList - Array of events to group
 * @param locale - Locale for month label formatting (default: 'en-US')
 * @returns Array of events grouped by month with formatted labels
 */
export function groupEventsByMonth(
	eventList: (typeof events.$inferSelect)[],
	locale: string = 'en-US'
): EventsByMonth {
	// Group events by month key
	const groupedByMonth = new Map<string, (typeof events.$inferSelect)[]>();

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
