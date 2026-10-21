import { storedId } from '#lib/server/validation';
import { scheduleSchema, updateScheduleSchema, type ScheduleInput } from '#lib/server/scheduleForm';
import * as v from 'valibot';
import { form } from '$app/server';
import { error } from '@sveltejs/kit';
import { db } from '#lib/server/db';
import { scheduleLocations, schedules } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { requireEventManager } from '#lib/server/authz';
import { sanitizeRichText } from '#lib/utils/html';

/**
 * The columns both the add and edit forms write, with their times validated.
 *
 * The venue must belong to the same event: the id comes from the form, and a
 * venue of someone else's event would otherwise leak its name onto this one.
 */
async function scheduleValues(data: ScheduleInput) {
	const startDate = new Date(data.startDate);
	const endDate = new Date(data.endDate);

	const locationId = data.locationId ? Number(data.locationId) : null;
	if (locationId !== null) {
		const [venue] = await db
			.select({ id: scheduleLocations.id })
			.from(scheduleLocations)
			.where(and(eq(scheduleLocations.id, locationId), eq(scheduleLocations.eventId, data.eventId)))
			.limit(1);
		if (!venue) error(400, 'Unknown venue');
	}

	return {
		name: data.name,
		startDate,
		endDate,
		locationId,
		// Rendered with {@html} on the public page, so never store raw markup.
		description: sanitizeRichText(data.description?.trim() ?? '') || null
	};
}

/**
 * Item ids come from the form, so every write matches on the event the caller
 * was authorised for as well — otherwise a manager of one event could name any
 * other event's items.
 */
const ofEvent = (id: string, eventId: string) =>
	and(eq(schedules.id, id), eq(schedules.eventId, eventId));

export const addSchedule = form(scheduleSchema, async (data) => {
	await requireEventManager(data.eventId);
	await db.insert(schedules).values({
		id: ulid().toLowerCase(),
		eventId: data.eventId,
		...(await scheduleValues(data))
	});
});

export const updateSchedule = form(updateScheduleSchema, async (data) => {
	await requireEventManager(data.eventId);
	const updated = await db
		.update(schedules)
		.set({ ...(await scheduleValues(data)), updatedAt: new Date() })
		.where(ofEvent(data.id, data.eventId))
		.returning({ id: schedules.id });
	if (updated.length === 0) error(404, 'Schedule item not found');
});

export const deleteSchedule = form(v.object({ id: storedId, eventId: storedId }), async (data) => {
	await requireEventManager(data.eventId);
	const deleted = await db
		.delete(schedules)
		.where(ofEvent(data.id, data.eventId))
		.returning({ id: schedules.id });
	if (deleted.length === 0) error(404, 'Schedule item not found');
});
