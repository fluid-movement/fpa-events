import { db } from '#lib/server/db';
import { eventLocations } from '#lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export async function findOrCreateEventLocation(
	city: string,
	country: string,
	latitude: number,
	longitude: number
): Promise<number> {
	const [existing] = await db
		.select()
		.from(eventLocations)
		.where(and(eq(eventLocations.city, city), eq(eventLocations.country, country)))
		.limit(1);
	if (existing) return existing.id;
	const [created] = await db
		.insert(eventLocations)
		.values({ city, country, latitude, longitude })
		.returning();
	return created.id;
}
