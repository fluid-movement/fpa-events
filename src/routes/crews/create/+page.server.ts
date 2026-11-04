import { requireSignedIn } from '#lib/server/authz';
import { db } from '#lib/server/db';
import { cities } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	requireSignedIn(locals);
	const value = url.searchParams.get('city');
	const id = value && /^\d+$/.test(value) ? Number(value) : NaN;
	if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) return { city: null };
	const [city] = await db.select().from(cities).where(eq(cities.id, id));
	return { city: city ?? null };
}) satisfies PageServerLoad;
