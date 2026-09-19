import * as v from 'valibot';
import { form } from '$app/server';
import { db } from '#lib/server/db';
import { eventMagicLinks } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { requireEventManager } from '#lib/server/authz';

const schema = v.object({ eventId: v.string() });

/** How long a co-organizer invite stays usable. */
const LINK_TTL_MS = 48 * 60 * 60 * 1000;

function issueLink(eventId: string) {
	return db.insert(eventMagicLinks).values({
		id: ulid().toLowerCase(),
		eventId,
		expiresAt: new Date(Date.now() + LINK_TTL_MS)
	});
}

export const generateLink = form(schema, async ({ eventId }) => {
	await requireEventManager(eventId);
	await issueLink(eventId);
});

export const regenerateLink = form(schema, async ({ eventId }) => {
	await requireEventManager(eventId);
	// One live link per event: the old one stops working the moment this runs.
	await db.delete(eventMagicLinks).where(eq(eventMagicLinks.eventId, eventId));
	await issueLink(eventId);
});
