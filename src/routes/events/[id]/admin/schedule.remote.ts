import * as v from 'valibot';
import { form } from '$app/server';
import { db } from '$lib/server/db';
import { schedules } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { requireEventManager } from '$lib/server/authz';

const scheduleBaseSchema = v.object({
	eventId: v.string(),
	name: v.pipe(v.string(), v.minLength(1)),
	startDate: v.pipe(v.string(), v.minLength(1)),
	endDate: v.pipe(v.string(), v.minLength(1)),
	locationId: v.optional(v.string()),
	description: v.optional(v.string())
});

export const addSchedule = form(scheduleBaseSchema, async (data) => {
	await requireEventManager(data.eventId);
	const start = new Date(data.startDate);
	const end = new Date(data.endDate);
	if (end <= start) throw new Error('End time must be after start time');

	await db.insert(schedules).values({
		id: ulid().toLowerCase(),
		eventId: data.eventId,
		name: data.name,
		startDate: start,
		endDate: end,
		locationId: data.locationId ? parseInt(data.locationId) : null,
		description: data.description?.trim() || null
	});
});

export const updateSchedule = form(
	v.object({ id: v.string(), ...scheduleBaseSchema.entries }),
	async (data) => {
		await requireEventManager(data.eventId);
		const start = new Date(data.startDate);
		const end = new Date(data.endDate);
		if (end <= start) throw new Error('End time must be after start time');

		await db
			.update(schedules)
			.set({
				name: data.name,
				startDate: start,
				endDate: end,
				locationId: data.locationId ? parseInt(data.locationId) : null,
				description: data.description?.trim() || null,
				updatedAt: new Date()
			})
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
