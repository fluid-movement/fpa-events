import { describe, expect, it } from 'vitest';
import {
	biggestJam,
	busiestJamMonth,
	bucketJamMonths,
	yearsOfJams,
	type JamSummary
} from './crewStats';
import { formatMonth } from './dates';

const jam = (id: string, date: string, attendeeCount = 0): JamSummary => ({
	id,
	name: id,
	startDate: new Date(`${date}T12:00:00`),
	attendeeCount
});

describe('crew jam stats', () => {
	it('buckets months across years and picks the earliest month on ties', () => {
		const months = bucketJamMonths([
			jam('a', '2023-07-01'),
			jam('b', '2024-07-01'),
			jam('c', '2024-02-01'),
			jam('d', '2025-02-01')
		]);
		expect(months[6]).toBe(2);
		expect(months[1]).toBe(2);
		expect(busiestJamMonth(months)).toBe(1);
		expect(formatMonth(new Date(2000, 1, 1))).toBe('February');
	});

	it('uses inclusive calendar years and ignores future jams', () => {
		const now = new Date('2026-01-01T12:00:00');
		expect(yearsOfJams([jam('a', '2024-12-31')], now)).toBe('3 years of jams');
		expect(yearsOfJams([jam('a', '2026-01-01')], now)).toBe('1 year of jams');
		expect(yearsOfJams([jam('a', '2027-01-01')], now)).toBe('The story starts here');
	});

	it('picks the most attended jam with stable earliest-date ties without mutating input', () => {
		const rows = [
			jam('later', '2025-07-01', 4),
			jam('early', '2024-07-01', 4),
			jam('small', '2023-01-01', 1)
		];
		expect(biggestJam(rows)?.name).toBe('early');
		expect(rows[0].id).toBe('later');
		expect(biggestJam([jam('b', '2024-01-01'), jam('a', '2024-01-01')])?.id).toBe('a');
	});

	it('returns friendly empty values for a city without events', () => {
		expect(bucketJamMonths([])).toEqual(Array(12).fill(0));
		expect(busiestJamMonth(bucketJamMonths([]))).toBeNull();
		expect(biggestJam([])).toBeNull();
		expect(yearsOfJams([], new Date())).toBe('The story starts here');
	});
});
