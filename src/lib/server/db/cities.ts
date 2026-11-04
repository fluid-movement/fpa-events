import { db } from '#lib/server/db';
import { cities } from '#lib/server/db/schema';
import { and, sql } from 'drizzle-orm';

/**
 * One shared marker per case-insensitive (country, city). Photon has no stable
 * place ID, so text defines identity and the first writer's coordinates win.
 * Callers must have validated coordinates as finite and in range.
 */
export async function findOrCreateCity(
	city: string,
	country: string,
	latitude: number,
	longitude: number
): Promise<number> {
	await db.insert(cities).values({ city, country, latitude, longitude }).onConflictDoNothing();

	// A separate statement sees a concurrent winner after ON CONFLICT waits for
	// its insert to commit. Never update the shared marker's coordinates.
	const [existing] = await db
		.select({ id: cities.id })
		.from(cities)
		.where(
			and(
				sql`lower(${cities.country}) = lower(${country})`,
				sql`lower(${cities.city}) = lower(${city})`
			)
		)
		.limit(1);
	return existing.id;
}
