import * as v from 'valibot';
import { form } from '$app/server';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { ulid } from 'ulid';
import { db } from '#lib/server/db';
import { crewJams, crews } from '#lib/server/db/schema';
import { requireCrewAdmin } from '#lib/server/authz';
import { optionalCoordinate, storedId, text } from '#lib/server/validation';
import { isJamTime } from '#lib/crew-jams';

const jamSchema = v.object({
	crewId: storedId,
	id: v.union([v.literal(''), storedId]),
	weekday: v.pipe(text, v.regex(/^[0-6]$/), v.transform(Number)),
	startTime: v.pipe(text, v.check(isJamTime, 'Enter a valid HH:MM time.')),
	name: v.pipe(text, v.trim(), v.minLength(1), v.maxLength(200)),
	address: v.optional(v.pipe(text, v.maxLength(1000))),
	latitude: optionalCoordinate(90),
	longitude: optionalCoordinate(180),
	note: v.optional(v.pipe(text, v.trim(), v.maxLength(1000)))
});

export const saveJam = form(jamSchema, async (data) => {
	await requireCrewAdmin(data.crewId);
	await db.transaction(async (tx) => {
		// Serialize additions per crew so concurrent requests cannot exceed ten.
		await tx.select({ id: crews.id }).from(crews).where(eq(crews.id, data.crewId)).for('update');
		const hasCoords = data.latitude !== null && data.longitude !== null;
		const values = {
			weekday: data.weekday,
			startTime: data.startTime,
			venueName: data.name,
			address: data.address?.trim() || null,
			latitude: hasCoords ? data.latitude : null,
			longitude: hasCoords ? data.longitude : null,
			note: data.note || null
		};
		if (data.id) {
			const rows = await tx
				.update(crewJams)
				.set(values)
				.where(and(eq(crewJams.crewId, data.crewId), eq(crewJams.id, data.id)))
				.returning({ id: crewJams.id });
			if (!rows.length) error(404, 'Jam not found');
		} else {
			const rows = await tx
				.select({ id: crewJams.id })
				.from(crewJams)
				.where(eq(crewJams.crewId, data.crewId));
			if (rows.length >= 10) error(400, 'A crew can have at most 10 regular jams.');
			await tx
				.insert(crewJams)
				.values({ id: ulid().toLowerCase(), crewId: data.crewId, ...values });
		}
	});
});

export const deleteJam = form(
	v.object({ crewId: storedId, id: storedId }),
	async ({ crewId, id }) => {
		await requireCrewAdmin(crewId);
		const rows = await db
			.delete(crewJams)
			.where(and(eq(crewJams.crewId, crewId), eq(crewJams.id, id)))
			.returning({ id: crewJams.id });
		if (!rows.length) error(404, 'Jam not found');
	}
);
