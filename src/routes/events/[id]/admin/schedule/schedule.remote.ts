import * as v from 'valibot';
import { form } from '$app/server';
import { db } from '#lib/server/db';
import { schedules } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { requireEventManager } from '#lib/server/authz';

const scheduleSchema = v.object({
	eventId: v.string(),
	name: v.pipe(v.string(), v.minLength(1)),
	startDate: v.pipe(v.string(), v.minLength(1)),
	endDate: v.pipe(v.string(), v.minLength(1)),
	locationId: v.optional(v.string()),
	description: v.optional(v.string())
});

type ScheduleInput = v.InferOutput<typeof scheduleSchema>;

/** The columns both the add and edit forms write, with their times validated. */
function scheduleValues(data: ScheduleInput) {
	const startDate = new Date(data.startDate);
	const endDate = new Date(data.endDate);
	if (endDate <= startDate) throw new Error('End time must be after start time');

	return {
		name: data.name,
		startDate,
		endDate,
		locationId: data.locationId ? parseInt(data.locationId, 10) : null,
		description: data.description?.trim() || null
	};
}

export const addSchedule = form(scheduleSchema, async (data) => {
	await requireEventManager(data.eventId);
	await db.insert(schedules).values({
		id: ulid().toLowerCase(),
		eventId: data.eventId,
		...scheduleValues(data)
	});
});

export const updateSchedule = form(
	v.object({ id: v.string(), ...scheduleSchema.entries }),
	async (data) => {
		await requireEventManager(data.eventId);
		await db
			.update(schedules)
			.set({ ...scheduleValues(data), updatedAt: new Date() })
			.where(eq(schedules.id, data.id));
	}
);

export const deleteSchedule = form(
	v.object({ id: v.string(), eventId: v.string() }),
	async (data) => {
		await requireEventManager(data.eventId);
		await db.delete(schedules).where(eq(schedules.id, data.id));
	}
);
