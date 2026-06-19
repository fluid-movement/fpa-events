import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { daysUntil, countdownLabel, formatDateRange } from './dates';

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
