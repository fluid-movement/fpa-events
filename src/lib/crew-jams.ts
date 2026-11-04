export type JamTime = { weekday: number; startTime: string };

export const isJamTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export const isJamWeekday = (value: number): boolean =>
	Number.isInteger(value) && value >= 0 && value <= 6;

export function weekdayName(weekday: number, style: 'long' | 'short' = 'long', locale = 'en-US') {
	return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
		new Date(Date.UTC(2024, 0, 1 + weekday))
	);
}

export function sortJams<T extends JamTime>(jams: readonly T[]): T[] {
	return [...jams].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}

/** No coordinate-to-zone lookup exists in this app; callers use the viewer's local zone. */
export function nextJamDate(jam: JamTime, now: Date, timeZone?: string): Date {
	if (!isJamWeekday(jam.weekday) || !isJamTime(jam.startTime)) throw new RangeError('Invalid jam');
	const [hour, minute] = jam.startTime.split(':').map(Number);
	if (!timeZone) {
		const date = new Date(now);
		date.setDate(date.getDate() + ((jam.weekday - ((date.getDay() + 6) % 7) + 7) % 7));
		date.setHours(hour, minute, 0, 0);
		if (date < now) date.setDate(date.getDate() + 7);
		return date;
	}
	// Convert wall-clock calendar parts to an instant, correcting for the zone's offset.
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const parts = (date: Date) => {
		const values = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
		return Date.UTC(
			+values.year,
			+values.month - 1,
			+values.day,
			+values.hour,
			+values.minute,
			+values.second
		);
	};
	const wallNow = new Date(parts(now));
	const wall = new Date(wallNow);
	wall.setUTCDate(wall.getUTCDate() + ((jam.weekday - ((wall.getUTCDay() + 6) % 7) + 7) % 7));
	wall.setUTCHours(hour, minute, 0, 0);
	const toInstant = () => {
		let instant = wall.getTime();
		for (let i = 0; i < 3; i++) instant += wall.getTime() - parts(new Date(instant));
		return new Date(instant);
	};
	let date = toInstant();
	if (date < now) {
		wall.setUTCDate(wall.getUTCDate() + 7);
		date = toInstant();
	}
	return date;
}

export function nextJam<T extends JamTime>(
	jams: readonly T[],
	now: Date,
	timeZone?: string
): T | undefined {
	return [...jams].sort(
		(a, b) => nextJamDate(a, now, timeZone).getTime() - nextJamDate(b, now, timeZone).getTime()
	)[0];
}
