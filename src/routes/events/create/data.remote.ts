import { redirect } from '@sveltejs/kit';
import { form } from '$app/server';
import { resolve } from '$app/paths';
import { ulid } from 'ulid';
import { db } from '#lib/server/db';
import { events, eventUser } from '#lib/server/db/schema';
import { eventFormSchema, parsePictureFields, resolveEventLocationId } from '#lib/server/eventForm';
import { requireSignedInRequest } from '#lib/server/authz';
import { requireTurnstile } from '#lib/server/turnstile';

const NO_PICTURE = { picture: null, pictureWidth: null, pictureHeight: null };

export const createEvent = form(eventFormSchema, async (data) => {
	const signedIn = requireSignedInRequest();
	await requireTurnstile(data.turnstileToken);

	const eventId = ulid().toLowerCase();

	await db.insert(events).values({
		id: eventId,
		userId: signedIn.id,
		name: data.name,
		description: data.description,
		startDate: new Date(data.startDate),
		endDate: new Date(data.endDate),
		location: data.location,
		eventLocationId: await resolveEventLocationId(data),
		...parsePictureFields(data, NO_PICTURE)
	});
	await db.insert(eventUser).values({ eventId, userId: signedIn.id, status: 'organizing' });

	// Land the new organizer in the manage area, not the public page — it's where the
	// remaining setup steps live.
	redirect(303, resolve('/events/[id]/admin', { id: eventId }));
});
