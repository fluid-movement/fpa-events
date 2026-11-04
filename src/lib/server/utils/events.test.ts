import { describe, it, expect } from 'vitest';
import { groupEventsByMonth, splitEventsByEndDate } from './events';
import type { Event } from '#lib/types/event';

function makeEvent(overrides: Partial<Event> & { startDate: Date; endDate: Date }): Event {
	return {
		id: 'test-id',
		userId: 'user-1',
		name: 'Test Event',
		location: 'Somewhere',
		cityId: null,
		description: '',
		picture: null,
		pictureWidth: null,
		pictureHeight: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

describe('groupEventsByMonth', () => {
	it('returns empty array for no events', () => {
		expect(groupEventsByMonth([])).toEqual([]);
	});

	it('groups events in the same month together', () => {
		const events = [
			makeEvent({ id: '1', startDate: new Date('2026-08-05'), endDate: new Date('2026-08-07') }),
			makeEvent({ id: '2', startDate: new Date('2026-08-20'), endDate: new Date('2026-08-22') })
		];
		const result = groupEventsByMonth(events);
		expect(result).toHaveLength(1);
		expect(result[0].month).toBe('2026-08');
		expect(result[0].events).toHaveLength(2);
	});

	it('puts events from different months in separate groups', () => {
		const events = [
			makeEvent({ id: '1', startDate: new Date('2026-08-05'), endDate: new Date('2026-08-07') }),
			makeEvent({ id: '2', startDate: new Date('2026-09-10'), endDate: new Date('2026-09-12') })
		];
		const result = groupEventsByMonth(events);
		expect(result).toHaveLength(2);
		expect(result[0].month).toBe('2026-08');
		expect(result[1].month).toBe('2026-09');
	});

	it('sorts groups chronologically', () => {
		const events = [
			makeEvent({ id: '1', startDate: new Date('2026-10-01'), endDate: new Date('2026-10-02') }),
			makeEvent({ id: '2', startDate: new Date('2026-08-01'), endDate: new Date('2026-08-02') }),
			makeEvent({ id: '3', startDate: new Date('2026-09-01'), endDate: new Date('2026-09-02') })
		];
		const result = groupEventsByMonth(events);
		expect(result.map((g) => g.month)).toEqual(['2026-08', '2026-09', '2026-10']);
	});

	it('produces a readable label for each month', () => {
		const events = [
			makeEvent({ startDate: new Date('2026-08-14'), endDate: new Date('2026-08-17') })
		];
		const [group] = groupEventsByMonth(events);
		expect(group.label).toBe('August 2026');
	});

	it('handles events spanning year boundaries', () => {
		const events = [
			makeEvent({ id: '1', startDate: new Date('2025-12-28'), endDate: new Date('2025-12-30') }),
			makeEvent({ id: '2', startDate: new Date('2026-01-03'), endDate: new Date('2026-01-05') })
		];
		const result = groupEventsByMonth(events);
		expect(result).toHaveLength(2);
		expect(result[0].month).toBe('2025-12');
		expect(result[1].month).toBe('2026-01');
	});
});

describe('splitEventsByEndDate', () => {
	const now = new Date('2026-11-04T12:00:00Z');
	const event = (id: string, start: string, end: string) => ({
		id,
		startDate: new Date(start),
		endDate: new Date(end),
		attendeeCount: 3
	});
	it('keeps ongoing events and the exact end boundary upcoming, and orders both windows', () => {
		const rows = [
			event('future-late', '2026-12-01', '2026-12-02'),
			event('past-old', '2026-01-01', '2026-01-02'),
			event('boundary', '2026-11-03', now.toISOString()),
			event('past-recent', '2026-11-01', '2026-11-04T11:59:59.999Z'),
			event('ongoing', '2026-11-02', '2026-11-06'),
			event('future-soon', '2026-11-05', '2026-11-06')
		];
		const original = [...rows];
		const result = splitEventsByEndDate(rows, now);
		expect(result.upcoming.map((row) => row.id)).toEqual([
			'ongoing',
			'boundary',
			'future-soon',
			'future-late'
		]);
		expect(result.past.map((row) => row.id)).toEqual(['past-recent', 'past-old']);
		expect(rows).toEqual(original);
		expect(result.upcoming[0]).toBe(rows[4]);
	});
	it('handles an empty city', () => {
		expect(splitEventsByEndDate([], now)).toEqual({ upcoming: [], past: [] });
	});
});
