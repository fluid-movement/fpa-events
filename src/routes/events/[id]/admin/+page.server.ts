import { db } from '$lib/server/db';
import { events, schedules, eventUser, user, eventMagicLinks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, redirect, fail, type ServerLoadEvent } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad, Actions } from './$types';
import { ulid } from 'ulid';

export const load: PageServerLoad = async ({ params, locals, url }: ServerLoadEvent) => {
	if (!locals.user) {
		redirect(307, resolve('/sign-in'));
	}

	if (!params.id) error(404, 'Not found');

	const [event] = await db.select().from(events).where(eq(events.id, params.id));
	if (!event) error(404, 'Not found');

	if (locals.user.id !== event.userId) {
		redirect(307, resolve(`/events/${params.id}`));
	}

	const [eventSchedules, attendees, magicLinks] = await Promise.all([
		db.select().from(schedules).where(eq(schedules.eventId, params.id)),
		db
			.select({
				id: eventUser.id,
				status: eventUser.status,
				userId: eventUser.userId,
				name: user.name,
				email: user.email
			})
			.from(eventUser)
			.innerJoin(user, eq(eventUser.userId, user.id))
			.where(eq(eventUser.eventId, params.id)),
		db.select().from(eventMagicLinks).where(eq(eventMagicLinks.eventId, params.id))
	]);

	return {
		event,
		schedules: eventSchedules,
		attendees,
		magicLink: magicLinks[0] ?? null,
		origin: url.origin
	};
};

export const actions: Actions = {
	addSchedule: async ({ params, locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		if (!params.id) return fail(404, { error: 'Not found' });

		const [event] = await db.select().from(events).where(eq(events.id, params.id));
		if (!event || event.userId !== locals.user.id) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const startDate = data.get('startDate')?.toString();
		const endDate = data.get('endDate')?.toString();
		const location = data.get('location')?.toString().trim() || null;
		const description = data.get('description')?.toString().trim() || null;

		if (!name) return fail(400, { error: 'Name is required' });
		if (!startDate || !endDate) return fail(400, { error: 'Dates are required' });

		const start = new Date(startDate);
		const end = new Date(endDate);
		if (end <= start) return fail(400, { error: 'End date must be after start date' });

		await db.insert(schedules).values({
			id: ulid().toLowerCase(),
			eventId: params.id,
			name,
			startDate: start,
			endDate: end,
			location,
			description
		});

		return { success: true };
	},

	updateSchedule: async ({ params, locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		if (!params.id) return fail(404, { error: 'Not found' });

		const [event] = await db.select().from(events).where(eq(events.id, params.id));
		if (!event || event.userId !== locals.user.id) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();
		const startDate = data.get('startDate')?.toString();
		const endDate = data.get('endDate')?.toString();
		const location = data.get('location')?.toString().trim() || null;
		const description = data.get('description')?.toString().trim() || null;

		if (!id) return fail(400, { error: 'ID is required' });
		if (!name) return fail(400, { error: 'Name is required' });
		if (!startDate || !endDate) return fail(400, { error: 'Dates are required' });

		const start = new Date(startDate);
		const end = new Date(endDate);
		if (end <= start) return fail(400, { error: 'End date must be after start date' });

		await db
			.update(schedules)
			.set({ name, startDate: start, endDate: end, location, description, updatedAt: new Date() })
			.where(eq(schedules.id, id));

		return { success: true };
	},

	deleteSchedule: async ({ params, locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		if (!params.id) return fail(404, { error: 'Not found' });

		const [event] = await db.select().from(events).where(eq(events.id, params.id));
		if (!event || event.userId !== locals.user.id) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'ID is required' });

		await db.delete(schedules).where(eq(schedules.id, id));

		return { success: true };
	},

	generateLink: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		if (!params.id) return fail(404, { error: 'Not found' });

		const [event] = await db.select().from(events).where(eq(events.id, params.id));
		if (!event || event.userId !== locals.user.id) return fail(403, { error: 'Forbidden' });

		const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
		await db.insert(eventMagicLinks).values({
			id: ulid().toLowerCase(),
			eventId: params.id,
			expiresAt
		});

		return { success: true };
	},

	regenerateLink: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		if (!params.id) return fail(404, { error: 'Not found' });

		const [event] = await db.select().from(events).where(eq(events.id, params.id));
		if (!event || event.userId !== locals.user.id) return fail(403, { error: 'Forbidden' });

		await db.delete(eventMagicLinks).where(eq(eventMagicLinks.eventId, params.id));

		const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
		await db.insert(eventMagicLinks).values({
			id: ulid().toLowerCase(),
			eventId: params.id,
			expiresAt
		});

		return { success: true };
	},

	deleteEvent: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		if (!params.id) return fail(404, { error: 'Not found' });

		const [event] = await db.select().from(events).where(eq(events.id, params.id));
		if (!event || event.userId !== locals.user.id) return fail(403, { error: 'Forbidden' });

		await db.delete(events).where(eq(events.id, params.id));

		redirect(302, resolve('/events'));
	}
};
