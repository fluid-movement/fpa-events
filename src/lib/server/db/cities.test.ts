import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect, getTableConfig } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { cities } from './schema';
import { findOrCreateCity } from './cities';

const dialect = new PgDialect();
const values = vi.fn();
const onConflictDoNothing = vi.fn();
const where = vi.fn();
const limit = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(db.insert).mockReturnValue({ values } as never);
	values.mockReturnValue({ onConflictDoNothing });
	onConflictDoNothing.mockResolvedValue([]);
	vi.mocked(db.select).mockReturnValue({
		from: () => ({ where })
	} as never);
	where.mockReturnValue({ limit });
	limit.mockResolvedValue([{ id: 7 }]);
});

describe('findOrCreateCity', () => {
	it('reuses the winning city even when submitted coordinates differ, without updating it', async () => {
		expect(await findOrCreateCity('Berlin', 'Germany', 52.52, 13.405)).toBe(7);
		expect(await findOrCreateCity('BERLIN', 'GERMANY', 53, 14)).toBe(7);
		expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
		expect(db.update).not.toHaveBeenCalled();
		expect(values).toHaveBeenLastCalledWith({
			city: 'BERLIN',
			country: 'GERMANY',
			latitude: 53,
			longitude: 14
		});
		expect(onConflictDoNothing.mock.invocationCallOrder[1]).toBeLessThan(
			vi.mocked(db.select).mock.invocationCallOrder[1]
		);
	});

	it('selects by lower(country), lower(city), independent of coordinates', async () => {
		await findOrCreateCity('Berlin', 'Germany', 52.52, 13.405);
		const query = dialect.sqlToQuery(where.mock.calls[0][0] as SQL);
		expect(query.sql).toBe(
			'(lower("cities"."country") = lower($1) and lower("cities"."city") = lower($2))'
		);
		expect(query.params).toEqual(['Germany', 'Berlin']);
	});

	it('enforces the same case-insensitive country/city key with a unique index', () => {
		const index = getTableConfig(cities).indexes.find(
			(index) => index.config.name === 'cities_country_city_unique'
		)!;
		expect(index.config.unique).toBe(true);
		expect(index.config.columns.map((column) => dialect.sqlToQuery(sql`${column}`).sql)).toEqual([
			'lower("cities"."country")',
			'lower("cities"."city")'
		]);
	});
});
