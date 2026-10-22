import { describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import * as v from 'valibot';
import { ulid } from 'ulid';
import {
	fpaId,
	isCalendarToken,
	optionalCoordinate,
	parseArchiveYear,
	rejectNulPath,
	storedIdParam,
	text
} from './validation';

function expectStatus(fn: () => unknown, status: number) {
	try {
		fn();
		expect.fail('Expected HttpError');
	} catch (error) {
		expect(isHttpError(error, status)).toBe(true);
	}
}

describe('request validation', () => {
	it.each([
		'/events/%00',
		'/events/%00/admin/schedule',
		'/invite/%00',
		'/api/calendar/%00/feed.ics'
	])('rejects a NUL in %s', (path) => {
		expectStatus(() => rejectNulPath(new URL(path, 'https://example.org')), 400);
	});
	it('lets an ordinary path through', () => {
		rejectNulPath(new URL('/players/M%C3%BCller%20x', 'https://example.org'));
	});
	it.each(['bad', 'bad\0id', '', undefined, crypto.randomUUID()])(
		'answers a stored-id parameter %j with 404',
		(value) => {
			expectStatus(() => storedIdParam(value), 404);
		}
	);
	// Generated the way the app generates them, so a change of generator that
	// would 404 every real link fails here.
	it('accepts ids and tokens as the app generates them', () => {
		for (const id of [ulid().toLowerCase(), ulid(), '01m5a4te7kpbqedtvncyxkx1gn']) {
			expect(storedIdParam(id)).toBe(id);
		}
		expect(isCalendarToken(crypto.randomUUID())).toBe(true);
		expect(isCalendarToken(ulid().toLowerCase())).toBe(false);
		expect(isCalendarToken('\0')).toBe(false);
	});
	it('rejects NUL in remote text without discarding ordinary Unicode', () => {
		expect(v.safeParse(text, 'bad\0value').success).toBe(false);
		expect(v.parse(text, 'München 🥏')).toBe('München 🥏');
	});
});

describe('archive year', () => {
	it.each(['1970', '2026', '9998'])('accepts %s', (value) => {
		expect(parseArchiveYear(value)).toBe(Number(value));
	});
	it.each(['1969', '0000', '9999', '99999', '275761', '1e20', '-5000', 'NaN', '2026.5', ' 2026'])(
		'rejects %s',
		(value) => {
			expectStatus(() => parseArchiveYear(value), 400);
		}
	);
});

describe('coordinates', () => {
	const latitude = optionalCoordinate(90);
	const longitude = optionalCoordinate(180);
	it.each([
		['', null],
		[undefined, null],
		['abc', null],
		['48.137', 48.137],
		['-90', -90],
		['90', 90]
	])('reads latitude %j as %j', (value, expected) => {
		expect(v.parse(latitude, value)).toBe(expected);
	});
	it('accepts the full longitude range', () => {
		expect(v.parse(longitude, '-180')).toBe(-180);
		expect(v.parse(longitude, '180')).toBe(180);
	});
	// Finite, so they passed the old check, but Postgres `real` overflows (22003).
	it.each(['1e100', '-1e100', '3.5e38', '90.0001'])('rejects latitude %s', (value) => {
		expect(v.safeParse(latitude, value).success).toBe(false);
	});
	it.each(['1e100', '180.5', '-181'])('rejects longitude %s', (value) => {
		expect(v.safeParse(longitude, value).success).toBe(false);
	});
});

describe('fpaId', () => {
	it('accepts a UUID', () => {
		expect(v.safeParse(fpaId, '88a7c11c-fcce-402e-b3f4-b5d84acb27af').success).toBe(true);
	});

	it.each(['.', '..', '', ' ', '../x', '%2e%2e', 'abc', '88a7c11c-fcce-402e-b3f4-b5d84acb27af/x'])(
		'rejects %j',
		(value) => {
			expect(v.safeParse(fpaId, value).success).toBe(false);
		}
	);
});
