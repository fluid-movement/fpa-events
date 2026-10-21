import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { scheduleSchema, updateScheduleSchema } from './scheduleForm';
import { databaseId } from './validation';

const input = {
	eventId: '01m5a4te7kpbqedtvncyxkx1gn',
	name: 'Round one',
	startDate: '2030-06-01T10:00',
	endDate: '2030-06-01T11:00'
};

describe('schedule form validation', () => {
	it('accepts the real form format with optional venue', () => {
		expect(v.safeParse(scheduleSchema, input).success).toBe(true);
		expect(v.safeParse(scheduleSchema, { ...input, locationId: '' }).success).toBe(true);
		expect(v.safeParse(scheduleSchema, { ...input, locationId: '42' }).success).toBe(true);
	});
	it.each([
		'x',
		'NaN',
		'99999-01-01T10:00',
		'0000-01-01T10:00',
		'2030-02-30T10:00',
		'2030-06-01T24:00',
		'2030-06-01T10:99'
	])('rejects invalid date %s on add and update', (value) => {
		for (const field of ['startDate', 'endDate']) {
			for (const schema of [scheduleSchema, updateScheduleSchema]) {
				expect(v.safeParse(schema, { ...input, id: input.eventId, [field]: value }).success).toBe(
					false
				);
			}
		}
	});
	it.each(['2030-06-01T09:00', input.startDate])('rejects end at or before start', (endDate) => {
		expect(v.safeParse(scheduleSchema, { ...input, endDate }).success).toBe(false);
		expect(
			v.safeParse(updateScheduleSchema, { ...input, id: input.eventId, endDate }).success
		).toBe(false);
	});
	it('requires a valid item ID on update', () => {
		expect(v.safeParse(updateScheduleSchema, input).success).toBe(false);
		expect(v.safeParse(updateScheduleSchema, { ...input, id: input.eventId }).success).toBe(true);
	});
	it.each(['abc', 'NaN', '-1', '0', '42junk', '1.5', '2147483648'])(
		'rejects unsafe venue id %s in either use',
		(value) => {
			expect(v.safeParse(databaseId, value).success).toBe(false);
			expect(v.safeParse(scheduleSchema, { ...input, locationId: value }).success).toBe(false);
		}
	);
});
