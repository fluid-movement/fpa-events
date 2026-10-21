import * as v from 'valibot';
import { dateTime, optionalDatabaseId, storedId, text } from './validation';

export const scheduleEntries = {
	eventId: storedId,
	name: v.pipe(text, v.minLength(1)),
	startDate: dateTime,
	endDate: dateTime,
	locationId: optionalDatabaseId,
	description: v.optional(text)
};

/** Shared by add and update, so neither path can bypass date ordering. */
export const scheduleSchema = v.pipe(
	v.object(scheduleEntries),
	v.forward(
		v.partialCheck(
			[['startDate'], ['endDate']],
			({ startDate, endDate }) => new Date(endDate) > new Date(startDate),
			'End time must be after start time.'
		),
		['endDate']
	)
);

export const updateScheduleSchema = v.intersect([scheduleSchema, v.object({ id: storedId })]);
export type ScheduleInput = v.InferOutput<typeof scheduleSchema>;
