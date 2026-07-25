import * as v from 'valibot';
import { form } from '$app/server';
import { db } from '$lib/server/db';
import { eventMagicLinks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { requireEventManager } from '$lib/server/authz';

const schema = v.object({ eventId: v.string() });

export const generateLink = form(schema, async (data) => {
	await requireEventManager(data.eventId);
	const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
	await db.insert(eventMagicLinks).values({
		id: ulid().toLowerCase(),
		eventId: data.eventId,
		expiresAt
	});
});

export const regenerateLink = form(schema, async (data) => {
	await requireEventManager(data.eventId);
	await db.delete(eventMagicLinks).where(eq(eventMagicLinks.eventId, data.eventId));
	const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
	await db.insert(eventMagicLinks).values({
		id: ulid().toLowerCase(),
		eventId: data.eventId,
		expiresAt
	});
});
