import * as v from 'valibot';
import { error } from '@sveltejs/kit';

/** Postgres text cannot represent NUL. Reject it before any query is built. */
export const text = v.pipe(
	v.string(),
	v.check((value) => !value.includes('\0'), 'Invalid text.')
);

/** Every stored id is a ULID (event, invite, schedule; legacy rows kept theirs). */
export const isStoredId = (value: string): boolean => /^[0-7][0-9a-hjkmnp-tv-z]{25}$/i.test(value);
export const storedId = v.pipe(text, v.check(isStoredId, 'Invalid ID.'));

/**
 * Player, event and alias ids from fpa-api are UUIDs. Anything else (notably
 * `.` and `..`, which survive encodeURIComponent and are resolved as dot
 * segments in the upstream URL) is rejected before a path is built.
 */
export const isFpaId = (value: string): boolean =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const fpaId = v.pipe(text, v.check(isFpaId, 'Invalid ID.'));

/** Calendar tokens are `crypto.randomUUID()` (`regenerateCalendarToken`). */
export const isCalendarToken = (value: string): boolean =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/**
 * A route parameter that goes straight into a query by id: anything not in the
 * stored format is the route's own 404, as an unknown id is, without a query.
 * Called from the load, not `handle`, so the error page keeps the layout.
 */
export function storedIdParam(value: string | undefined, message = 'Not found'): string {
	if (value === undefined || !isStoredId(value)) error(404, message);
	return value;
}

/**
 * Runs in `handle` before the session lookup: a NUL can never be part of a
 * real path, and Postgres cannot store one, so it is a 400 on every route.
 * Id formats are checked per route by `storedIdParam`.
 */
export function rejectNulPath(url: URL): void {
	let path: string;
	try {
		path = decodeURIComponent(url.pathname);
	} catch {
		error(400, 'Invalid path');
	}
	if (path.includes('\0')) error(400, 'Invalid path');
}

/**
 * The archive queries `[1 January year, 1 January year + 1)` in local time, and
 * Postgres cannot take a five-digit ISO year (it answers 22009), so the last
 * year is 9998: its upper bound is year 9999 in every time zone.
 */
export const LAST_ARCHIVE_YEAR = 9998;

export function parseArchiveYear(value: string): number {
	if (!/^\d{4}$/.test(value)) error(400, 'Invalid year');
	const year = Number(value);
	if (year < 1970 || year > LAST_ARCHIVE_YEAR) error(400, 'Invalid year');
	return year;
}

/** Full decimal syntax; parseInt would silently accept values such as "12junk". */
export function integerText(max: number) {
	return v.pipe(
		text,
		v.regex(/^[0-9]+$/, 'Enter a positive integer.'),
		v.check((value) => Number(value) >= 1 && Number(value) <= max, 'Integer out of range.')
	);
}
export const databaseId = integerText(2_147_483_647);
export const optionalDatabaseId = v.optional(v.union([v.literal(''), databaseId]));
export const pictureDimension = v.optional(v.union([v.literal(''), integerText(100_000)]));

/** Reject impossible dates (Date otherwise rolls February 30 into March). */
export function isCalendarDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const calendarDate = v.pipe(text, v.check(isCalendarDate, 'Pick a valid date.'));

/** The form emits datetime-local values; ISO timestamps are also safe to store. */
export const dateTime = v.pipe(
	text,
	v.check((value) => {
		if (
			!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)
		)
			return false;
		if (!isCalendarDate(value.slice(0, 10))) return false;
		if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59) return false;
		const date = new Date(value);
		return (
			Number.isFinite(date.getTime()) && date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999
		);
	}, 'Enter a valid date and time.')
);

/**
 * An optional latitude or longitude: degrees within `±limit`, or null for "no
 * position". Parsed explicitly rather than with `v.transform(Number)`, because
 * `Number('')` is `0` and an empty field would otherwise persist a position in
 * the Gulf of Guinea. The range check also keeps values inside Postgres `real`,
 * which overflows (22003) on a finite but huge number such as `1e100`.
 */
export function optionalCoordinate(limit: 90 | 180) {
	return v.pipe(
		v.optional(text),
		v.transform((s) => {
			if (s === undefined || s.trim() === '') return null;
			const n = Number(s);
			return Number.isFinite(n) ? n : null;
		}),
		v.check((n) => n === null || Math.abs(n) <= limit, 'Coordinate out of range.')
	);
}
