import * as v from 'valibot';
import { redirect } from '@sveltejs/kit';
import { form, getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { events, eventUser } from '$lib/server/db/schema';
import { resolve } from '$app/paths';
import { ulid } from 'ulid';
import { findOrCreateEventLocation } from '$lib/server/db/eventLocations';
import { verifyTurnstile } from '$lib/server/turnstile';

const createEventSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	description: v.string(),
	startDate: v.string(),
	endDate: v.string(),
	location: v.string(),
	city: v.optional(v.string()),
	country: v.optional(v.string()),
	latitude: v.optional(v.string()),
	longitude: v.optional(v.string()),
	picture: v.optional(v.string()),
	pictureWidth: v.optional(v.string()),
	pictureHeight: v.optional(v.string()),
	turnstileToken: v.optional(v.string())
});

export const createEvent = form(createEventSchema, async (data) => {
	const event = getRequestEvent();
	if (!event.locals.user?.id) {
		throw new Error('Unauthorized: You must be logged in to create an event');
	}

	if (!(await verifyTurnstile(data.turnstileToken))) {
		throw new Error('Captcha verification failed');
	}

	const userId = event.locals.user.id;
	const eventId = ulid().toLowerCase();

	let eventLocationId: number | null = null;
	if (data.city && data.country && data.latitude && data.longitude) {
		eventLocationId = await findOrCreateEventLocation(
			data.city,
			data.country,
			parseFloat(data.latitude),
			parseFloat(data.longitude)
		);
	}

	const insertData: typeof events.$inferInsert = {
		id: eventId,
		userId,
		name: data.name,
		description: data.description,
		startDate: new Date(data.startDate),
		endDate: new Date(data.endDate),
		location: data.location,
		eventLocationId,
		picture: data.picture || null,
		pictureWidth: data.pictureWidth ? parseInt(data.pictureWidth) : null,
		pictureHeight: data.pictureHeight ? parseInt(data.pictureHeight) : null,
		createdAt: new Date()
	};

	await db.insert(events).values(insertData);
	await db.insert(eventUser).values({ eventId, userId, status: 'organizing' });

	redirect(303, resolve(`/events/${eventId}`));
});
