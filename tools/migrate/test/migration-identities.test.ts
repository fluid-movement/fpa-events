import { afterEach, describe, expect, it, vi } from 'vitest';
import { offline } from './helpers/offline';
import { migrateAll } from '../src/orchestrate';

function adversarial() {
	vi.spyOn(console, 'log').mockImplementation(() => {});
	const f = offline();
	f.state.map = {
		first: { city: 'A|B', country: 'C', latitude: 1, longitude: 2 },
		second: { city: 'A', country: 'B|C', latitude: 3, longitude: 4 }
	};
	f.fixture.rows.events[0].location = 'first';
	f.fixture.rows.events.push({
		...f.fixture.rows.events[0],
		id: '01M5A4X9AP5EG81X6ZCN9Q4JPK',
		location: 'second'
	});
	const schedule = f.fixture.rows.schedules[0];
	schedule.location = 'Hall';
	schedule.latitude = 1;
	schedule.longitude = 2;
	f.fixture.rows.schedules.push(
		{
			...schedule,
			id: '01M5A7A6MS1NSH8EMQ2QRC9WNT',
			location: 'Hall|1|2',
			latitude: null,
			longitude: null
		},
		{ ...schedule, id: '01M5A7A6MS1NSH8EMQ2QRC9WNV' }
	);
	return f;
}

afterEach(() => vi.restoreAllMocks());

describe('location tuple identity and independent verification', () => {
	it('preserves colliding city/country and coordinate/name-only venue tuples while deduping identical ones', async () => {
		const f = adversarial();
		await migrateAll(f.options, f.adapters);
		expect(f.state.tables.event_locations).toEqual([
			['A|B', 'C', 1, 2],
			['A', 'B|C', 3, 4]
		]);
		expect(f.state.tables.events.map((r) => r[6])).toEqual([1, 2]);
		expect(f.state.tables.schedule_locations.map((r) => r.slice(1, 5))).toEqual([
			['Hall', 'Hall', 1, 2],
			['Hall|1|2', null, null, null]
		]);
		expect(f.state.tables.schedules.map((r) => r[6])).toEqual([1, 2, 1]);
		expect(f.state.queries.at(-1)).toBe('COMMIT');
	});

	it.each(['event_locations', 'schedule_locations'])(
		'independent oracle rejects a collapsed %s count for delimiter-collision fixtures',
		async (table) => {
			const f = adversarial();
			// Simulate a stored collapse, without changing the source-derived oracle.
			f.state.countOverrides[table] = 1;
			const original = structuredClone(f.state.objects);
			await expect(migrateAll(f.options, f.adapters)).rejects.toThrow(
				`${table}: expected 2, got 1`
			);
			expect(f.state.objects).toEqual(original);
			expect(f.state.tables).toEqual(f.fixture.initialTables);
			expect(f.state.queries).not.toContain('COMMIT');
		}
	);
});
