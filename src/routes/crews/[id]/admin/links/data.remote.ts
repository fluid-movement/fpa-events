import * as v from 'valibot';
import { form } from '$app/server';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db';
import { crewLinks } from '#lib/server/db/schema';
import { requireCrewAdmin } from '#lib/server/authz';
import { text } from '#lib/server/validation';
import { CREW_LINK_KINDS, normalizeLinkUrl } from '#lib/crew-links';

const linkFields = v.object({
	crewId: text,
	website: text,
	instagram: text,
	facebook: text,
	youtube: text,
	tiktok: text,
	discord: text,
	whatsapp: text,
	telegram: text,
	other: text
});

export const saveCrewLinks = form(linkFields, async ({ crewId, ...fields }) => {
	await requireCrewAdmin(crewId);
	const rows: { crewId: string; kind: string; url: string }[] = [];
	for (const kind of CREW_LINK_KINDS) {
		let url: string;
		try {
			url = normalizeLinkUrl(kind, fields[kind]);
		} catch (error) {
			return { error: error instanceof Error ? error.message : 'Enter a valid HTTPS URL.' };
		}
		if (url) rows.push({ crewId, kind, url });
	}
	await db.transaction(async (tx) => {
		await tx.delete(crewLinks).where(eq(crewLinks.crewId, crewId));
		if (rows.length) await tx.insert(crewLinks).values(rows);
	});
	return { success: true };
});
