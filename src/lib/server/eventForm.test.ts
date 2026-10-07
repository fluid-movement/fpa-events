import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { eventFormSchema, isUploadedPictureUrl } from './eventForm';

// The gate that stops an organizer adopting someone else's picture URL (and
// then having the server delete it on replace).
describe('isUploadedPictureUrl', () => {
	const PUBLIC = 'https://cdn.example.com';

	it('accepts a fresh upload key', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, PUBLIC)).toBe(true);
	});

	it('tolerates a trailing slash on the configured public URL', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, `${PUBLIC}/`)).toBe(true);
	});

	it.each([
		['another host', 'https://evil.example.com/events/01abc.jpg'],
		['a legacy pictures/ key', `${PUBLIC}/pictures/old.jpg`],
		['a nested path', `${PUBLIC}/events/../pictures/old.jpg`],
		['a lookalike host', `${PUBLIC}.evil.com/events/01abc.jpg`]
	])('rejects %s', (_label, url) => {
		expect(isUploadedPictureUrl(url, PUBLIC)).toBe(false);
	});

	it('accepts nothing when no bucket is configured', () => {
		expect(isUploadedPictureUrl(`${PUBLIC}/events/01abc.jpg`, '')).toBe(false);
	});
});

describe('eventFormSchema dates', () => {
	const form = (startDate: string, endDate: string) => ({
		name: 'Jam',
		description: '',
		location: 'Berlin',
		startDate,
		endDate
	});
	const endDateIssues = (startDate: string, endDate: string) => {
		const result = v.safeParse(eventFormSchema, form(startDate, endDate));
		return result.success
			? []
			: result.issues.filter((issue) => v.getDotPath(issue) === 'endDate').map((i) => i.message);
	};

	it('accepts a range, and a single-day event', () => {
		expect(v.safeParse(eventFormSchema, form('2026-10-14', '2026-10-17')).success).toBe(true);
		expect(v.safeParse(eventFormSchema, form('2026-10-14', '2026-10-14')).success).toBe(true);
	});

	it('rejects an end before the start, on the end date field', () => {
		expect(endDateIssues('2026-10-17', '2026-10-14')).toEqual([
			'The event cannot end before it starts.'
		]);
	});

	it.each([
		['empty', ''],
		['not a date', 'next tuesday'],
		['an impossible month', '2026-13-01'],
		['a day that rolls over', '2026-02-30'],
		['a timestamp', '2026-10-14T10:00']
	])('rejects a date that is %s', (_label, value) => {
		expect(v.safeParse(eventFormSchema, form(value, '2026-10-17')).success).toBe(false);
	});
});
