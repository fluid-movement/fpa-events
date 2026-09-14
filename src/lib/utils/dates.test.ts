import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	countdownLabel,
	dateChipParts,
	daysBetween,
	daysUntil,
	formatCompactDateRange,
	formatDateRange,
	formatFullDateRange,
	formatShortDateRange
} from './dates';

describe('daysUntil', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-19T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns 0 for any time today', () => {
		// Any time on the same calendar day = 0
		expect(daysUntil(new Date('2026-06-19T00:00:00'))).toBe(0);
		expect(daysUntil(new Date('2026-06-19T23:59:59'))).toBe(0);
	});

	it('returns 1 for tomorrow', () => {
		expect(daysUntil(new Date('2026-06-20T00:00:00'))).toBe(1);
	});

	it('returns correct count for future dates', () => {
		expect(daysUntil(new Date('2026-06-26T00:00:00'))).toBe(7);
	});

	it('returns negative for past dates', () => {
		expect(daysUntil(new Date('2026-06-18T00:00:00'))).toBe(-1);
	});

	it('accepts a string date', () => {
		expect(daysUntil('2026-06-20')).toBe(1);
	});
});

describe('countdownLabel', () => {
	it('returns "Today" for 0 days', () => {
		expect(countdownLabel(0)).toBe('Today');
	});

	it('returns "Tomorrow" for 1 day', () => {
		expect(countdownLabel(1)).toBe('Tomorrow');
	});

	it('returns days away for future dates', () => {
		expect(countdownLabel(7)).toBe('7 days away');
		expect(countdownLabel(30)).toBe('30 days away');
	});

	it('returns days ago for negative values', () => {
		expect(countdownLabel(-3)).toBe('3 days ago');
	});
});

describe('formatDateRange', () => {
	it('formats a single day event', () => {
		const d = new Date('2026-08-14');
		expect(formatDateRange(d, d)).toBe('August 14, 2026');
	});

	it('formats a same-month range', () => {
		const start = new Date('2026-08-14');
		const end = new Date('2026-08-17');
		expect(formatDateRange(start, end)).toBe('14 - August 17, 2026');
	});

	it('formats a cross-month range', () => {
		const start = new Date('2026-08-30');
		const end = new Date('2026-09-02');
		expect(formatDateRange(start, end)).toBe('August 30 - September 2, 2026');
	});
});

describe('formatFullDateRange', () => {
	it('collapses a single-day event to one date', () => {
		const d = new Date('2026-08-14T12:00:00');
		expect(formatFullDateRange(d, d)).toBe('August 14, 2026');
	});

	it('spells out both ends of a multi-day range', () => {
		expect(formatFullDateRange('2026-08-14T12:00:00', '2026-08-17T12:00:00')).toBe(
			'August 14, 2026 – August 17, 2026'
		);
	});
});

describe('formatShortDateRange', () => {
	it('abbreviates the month and keeps the year', () => {
		expect(formatShortDateRange('2026-08-14T12:00:00', '2026-09-02T12:00:00')).toBe(
			'Aug 14, 2026 – Sep 2, 2026'
		);
	});

	it('collapses a single-day event', () => {
		const d = '2026-08-14T12:00:00';
		expect(formatShortDateRange(d, d)).toBe('Aug 14, 2026');
	});
});

describe('formatCompactDateRange', () => {
	it('drops the year entirely', () => {
		const d = '2026-08-14T12:00:00';
		expect(formatCompactDateRange(d, d)).toBe('Aug 14');
	});

	it('repeats only the day number within one month', () => {
		expect(formatCompactDateRange('2026-08-14T12:00:00', '2026-08-17T12:00:00')).toBe(
			'Aug 14 – 17'
		);
	});

	it('repeats the month across a month boundary', () => {
		expect(formatCompactDateRange('2026-08-30T12:00:00', '2026-09-02T12:00:00')).toBe(
			'Aug 30 – Sep 2'
		);
	});

	it('does not treat the same day in different years as one month', () => {
		expect(formatCompactDateRange('2025-08-14T12:00:00', '2026-08-17T12:00:00')).toBe(
			'Aug 14 – Aug 17'
		);
	});
});

describe('dateChipParts', () => {
	it('zero-pads the day and abbreviates the month', () => {
		expect(dateChipParts('2026-08-05T12:00:00')).toEqual({ day: '05', month: 'Aug' });
	});
});

describe('daysBetween', () => {
	it('includes both ends', () => {
		expect(daysBetween('2026-08-14T12:00:00', '2026-08-17T12:00:00')).toEqual([
			'2026-08-14',
			'2026-08-15',
			'2026-08-16',
			'2026-08-17'
		]);
	});

	it('returns a single day for a one-day event', () => {
		const d = '2026-08-14T12:00:00';
		expect(daysBetween(d, d)).toEqual(['2026-08-14']);
	});

	it('does not mutate a Date it was handed', () => {
		const start = new Date('2026-08-14T12:00:00');
		daysBetween(start, '2026-08-17T12:00:00');
		expect(start.getDate()).toBe(14);
	});

	it('returns nothing when the end precedes the start', () => {
		expect(daysBetween('2026-08-17T12:00:00', '2026-08-14T12:00:00')).toEqual([]);
	});
});
