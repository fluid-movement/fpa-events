import { describe, expect, it } from 'vitest';
import { isJamTime, isJamWeekday, nextJamDate, nextJam, sortJams, weekdayName } from './crew-jams';

describe('jam validation and ordering', () => {
	it.each(['00:00', '09:05', '23:59'])('accepts %s', (value) =>
		expect(isJamTime(value)).toBe(true)
	);
	it.each(['24:00', '12:60', '9:00', '12:00:00', '', ' 12:00', 'ab:cd'])('rejects %s', (value) =>
		expect(isJamTime(value)).toBe(false)
	);
	it('requires an integer Monday-based weekday', () => {
		expect([0, 6].every(isJamWeekday)).toBe(true);
		expect([-1, 7, 1.5, NaN].some(isJamWeekday)).toBe(false);
		expect(weekdayName(0)).toBe('Monday');
		expect(weekdayName(6, 'short')).toBe('Sun');
	});
	it('sorts without mutating input', () => {
		const jams = [
			{ weekday: 6, startTime: '10:00' },
			{ weekday: 0, startTime: '20:00' },
			{ weekday: 0, startTime: '09:00' }
		];
		expect(sortJams(jams)).toEqual([jams[2], jams[1], jams[0]]);
		expect(jams[0].weekday).toBe(6);
	});
});
describe('next jam', () => {
	const jam = { weekday: 0, startTime: '19:00' };
	it('uses today before start and next week after start, without mutating now', () => {
		const now = new Date(2026, 10, 2, 18, 0);
		expect(nextJamDate(jam, now)).toEqual(new Date(2026, 10, 2, 19, 0));
		expect(nextJamDate(jam, new Date(2026, 10, 2, 20, 0))).toEqual(new Date(2026, 10, 9, 19, 0));
		expect(now.getHours()).toBe(18);
	});
	it('includes an occurrence exactly now and wraps Sunday to Monday', () => {
		const now = new Date(2026, 10, 2, 19, 0);
		expect(nextJamDate(jam, now)).toEqual(now);
		expect(nextJamDate(jam, new Date(2026, 10, 1, 20, 0))).toEqual(now);
	});
	it('resolves explicit zones and the DST offset for the occurrence', () => {
		expect(nextJamDate(jam, new Date('2026-10-24T20:00:00Z'), 'Europe/Berlin').toISOString()).toBe(
			'2026-10-26T18:00:00.000Z'
		);
		expect(nextJamDate(jam, new Date('2026-11-02T20:00:00Z'), 'Asia/Tokyo').toISOString()).toBe(
			'2026-11-09T10:00:00.000Z'
		);
	});
	it('picks the soonest occurrence rather than the first weekday', () => {
		const tuesday = { weekday: 1, startTime: '19:00' };
		expect(nextJam([jam, tuesday], new Date(2026, 10, 2, 20, 0))).toBe(tuesday);
		expect(nextJam([], new Date())).toBeUndefined();
	});
	it('rejects impossible schedules', () => {
		expect(() => nextJamDate({ weekday: 7, startTime: '19:00' }, new Date())).toThrow(RangeError);
		expect(() => nextJamDate({ weekday: 0, startTime: '24:00' }, new Date())).toThrow(RangeError);
	});
});
