// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { LAST_ARCHIVE_YEAR } from '#lib/server/validation';

const mocks = vi.hoisted(() => ({ where: [] as (SQL | undefined)[] }));
vi.mock('#lib/server/utils/events', () => ({
	listEventsWithAttendeeCount: async (where: SQL | undefined) => {
		mocks.where.push(where);
		return [];
	},
	getArchiveYears: async () => [],
	withUserStatus: async (events: unknown[]) => events,
	groupEventsByMonth: () => []
}));
import { load } from './+page.server';

const originalTz = process.env.TZ;
afterEach(() => {
	process.env.TZ = originalTz;
	mocks.where.length = 0;
});

/** The values Drizzle hands the driver for the archive's date range. */
async function boundsFor(year: number): Promise<unknown[]> {
	await load({ params: { year: String(year) }, locals: {} } as Parameters<typeof load>[0]);
	return new PgDialect().sqlToQuery(mocks.where[0]!).params;
}

describe('past events archive range', () => {
	// Postgres rejects a five-digit ISO year with 22009, so even the last
	// accepted year's upper bound must stay at four digits, in any zone.
	it.each(['UTC', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Europe/Berlin'])(
		'keeps the last year inside four-digit years in %s',
		async (tz) => {
			process.env.TZ = tz;
			const params = await boundsFor(LAST_ARCHIVE_YEAR);
			expect(params).toHaveLength(2);
			for (const param of params) expect(param).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		}
	);
});
