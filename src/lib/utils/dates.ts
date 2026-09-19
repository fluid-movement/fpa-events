/**
 * Every date format the app renders lives here.
 *
 * Components used to each carry their own `formatDateRange`, which is how the
 * app ended up with four subtly different ones. Anything that renders a date
 * should call a function from this module rather than reaching for
 * `toLocaleDateString` inline.
 */

const DEFAULT_LOCALE = 'en-US';

/** Accept whatever a load function handed over — dates survive as strings. */
type DateLike = Date | string;

const toDate = (value: DateLike): Date => (value instanceof Date ? value : new Date(value));

export function toISODate(d: Date): string {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatTime(d: DateLike): string {
	return toDate(d).toLocaleTimeString(DEFAULT_LOCALE, { hour: 'numeric', minute: '2-digit' });
}

export function hoursUntil(d: DateLike): number {
	return Math.round((toDate(d).getTime() - Date.now()) / (1000 * 60 * 60));
}

export function daysUntil(date: DateLike): number {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const target = toDate(date);
	const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
	return Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function countdownLabel(days: number): string {
	if (days === 0) return 'Today';
	if (days === 1) return 'Tomorrow';
	if (days < 0) return `${Math.abs(days)} days ago`;
	return `${days} days away`;
}

/** The day/month pair shown in the square date chip on event cards. */
export function dateChipParts(date: DateLike, locale = DEFAULT_LOCALE) {
	const d = toDate(date);
	return {
		day: String(d.getDate()).padStart(2, '0'),
		month: d.toLocaleDateString(locale, { month: 'short' })
	};
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const sameMonth = (a: Date, b: Date) =>
	a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

/**
 * Day-first, spelled-out month: "5 January 2024", "5 - 8 January 2024",
 * "28 December - 3 January 2024". The default for page headers and detail rows.
 */
export function formatDateRange(start: DateLike, end: DateLike, locale = DEFAULT_LOCALE): string {
	const s = toDate(start);
	const e = toDate(end);

	if (sameDay(s, e)) {
		return s.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
	}

	const endStr = e.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
	if (sameMonth(s, e)) return `${s.getDate()} - ${endStr}`;

	return `${s.toLocaleDateString(locale, { day: 'numeric', month: 'long' })} - ${endStr}`;
}

/** Month-first with the year on both sides — "January 5, 2024 – January 8, 2024". */
function monthFirstRange(
	start: DateLike,
	end: DateLike,
	month: 'short' | 'long',
	locale: string
): string {
	const s = toDate(start);
	const e = toDate(end);
	const opts: Intl.DateTimeFormatOptions = { month, day: 'numeric', year: 'numeric' };
	const startStr = s.toLocaleDateString(locale, opts);
	return sameDay(s, e) ? startStr : `${startStr} – ${e.toLocaleDateString(locale, opts)}`;
}

/** "January 5, 2024" / "January 5, 2024 – January 8, 2024". */
export const formatFullDateRange = (start: DateLike, end: DateLike, locale = DEFAULT_LOCALE) =>
	monthFirstRange(start, end, 'long', locale);

/** "Jan 5, 2024" / "Jan 5, 2024 – Jan 8, 2024". Tight enough for a map popup. */
export const formatShortDateRange = (start: DateLike, end: DateLike, locale = DEFAULT_LOCALE) =>
	monthFirstRange(start, end, 'short', locale);

/**
 * Year-less and as short as it goes — "Jan 5", "Jan 5 – 8", "Jan 5 – Feb 2".
 * For cards that already show the year elsewhere.
 */
export function formatCompactDateRange(
	start: DateLike,
	end: DateLike,
	locale = DEFAULT_LOCALE
): string {
	const s = toDate(start);
	const e = toDate(end);
	const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
	const startStr = s.toLocaleDateString(locale, opts);

	if (sameDay(s, e)) return startStr;
	if (sameMonth(s, e)) return `${startStr} – ${e.getDate()}`;
	return `${startStr} – ${e.toLocaleDateString(locale, opts)}`;
}

/** Every calendar day the event spans, as ISO dates — the schedule day picker. */
export function daysBetween(start: DateLike, end: DateLike): string[] {
	// Cloned: the loop advances the cursor, and `toDate` hands back the caller's
	// own Date when it is given one.
	const cursor = new Date(toDate(start));
	const last = toDate(end);
	const days: string[] = [];
	while (cursor <= last) {
		days.push(toISODate(cursor));
		cursor.setDate(cursor.getDate() + 1);
	}
	return days;
}

/**
 * Parse a date as fpa-api writes it.
 *
 * The API mixes zero-padded and unpadded forms — `2026-07-29` alongside
 * `2020-2-8` — and `new Date(string)` treats the two differently: the padded
 * form matches the ISO grammar and is read as UTC midnight, the unpadded one
 * falls back to the implementation's local-time parse. Left alone that shifts
 * some dates a day west of the date they name and not others.
 *
 * Splitting the parts ourselves gives every date the same local-midnight
 * meaning. Returns null for a missing or unparseable value — upstream events
 * really can have no date at all.
 */
export function parseApiDate(value: string | null | undefined): Date | null {
	if (!value) return null;

	const parts = value.split('-');
	if (parts.length !== 3) return null;

	const [year, month, day] = parts.map(Number);
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;

	const date = new Date(year, month - 1, day);
	// Rejects the impossible (`2020-2-31` rolls over into March) rather than
	// silently rendering a date the source never claimed.
	return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Sortable `YYYY-MM-DD`, whichever form the API used. Null sorts last. */
export function apiDateKey(value: string | null | undefined): string | null {
	const date = parseApiDate(value);
	return date ? toISODate(date) : null;
}

/**
 * Date range for an upstream event, tolerant of the nulls and half-ranges the
 * API allows. Falls back to "Date unknown" rather than rendering "Invalid Date".
 */
export function formatApiDateRange(
	start: string | null | undefined,
	end: string | null | undefined,
	style: 'long' | 'short' = 'long',
	locale = DEFAULT_LOCALE
): string {
	const format = style === 'short' ? formatShortDateRange : formatFullDateRange;
	const s = parseApiDate(start);
	const e = parseApiDate(end);

	if (!s && !e) return 'Date unknown';
	// A half-range renders as the single day we do know, rather than inventing
	// the other end.
	if (!s) return format(e!, e!, locale);
	if (!e) return format(s, s, locale);
	return format(s, e, locale);
}
