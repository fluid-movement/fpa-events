import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events, schedules } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';

async function assertAccess(eventId: string) {
	const event = getRequestEvent();
	if (!event.locals.user) throw new Error('Unauthorized');
	const [ev] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
	if (!ev) throw new Error('Event not found');
	if (ev.userId !== event.locals.user.id && event.locals.role !== 'admin') {
		throw new Error('Forbidden');
	}
	return ev;
}

const scheduleBaseSchema = v.object({
	eventId: v.string(),
	name: v.pipe(v.string(), v.minLength(1)),
	startDate: v.pipe(v.string(), v.minLength(1)),
	endDate: v.pipe(v.string(), v.minLength(1)),
	locationId: v.optional(v.string()),
	description: v.optional(v.string())
});

export const addSchedule = form(scheduleBaseSchema, async (data) => {
	await assertAccess(data.eventId);
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
		await assertAccess(data.eventId);
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
		await assertAccess(data.eventId);
		await db.delete(schedules).where(eq(schedules.id, data.id));
	}
);
