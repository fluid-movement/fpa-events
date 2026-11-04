export type JamSummary = {
	id: string;
	name: string;
	startDate: Date;
	attendeeCount: number;
};

/** Calendar months across all years; January wins a tie with February. */
export function bucketJamMonths(events: JamSummary[]): number[] {
	const months = Array<number>(12).fill(0);
	for (const event of events) months[event.startDate.getMonth()]++;
	return months;
}

export function busiestJamMonth(months: number[]): number | null {
	const most = Math.max(0, ...months);
	return most === 0 ? null : months.indexOf(most);
}

/** Inclusive calendar years since the first jam that has actually started. */
export function yearsOfJams(events: JamSummary[], now: Date): string {
	const startedYears = events
		.filter((event) => event.startDate <= now)
		.map((event) => event.startDate.getFullYear());
	if (startedYears.length === 0) return 'The story starts here';
	const years = now.getFullYear() - Math.min(...startedYears) + 1;
	return `${years} ${years === 1 ? 'year' : 'years'} of jams`;
}

/** Stable ties: earliest start, then ID. Never mutate the caller's event list. */
export function biggestJam(events: JamSummary[]): JamSummary | null {
	return (
		[...events].sort(
			(a, b) =>
				b.attendeeCount - a.attendeeCount ||
				a.startDate.getTime() - b.startDate.getTime() ||
				a.id.localeCompare(b.id)
		)[0] ?? null
	);
}
