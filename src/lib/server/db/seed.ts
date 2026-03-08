import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { seed, reset } from 'drizzle-seed';
import * as schema from './schema';

async function main() {
	const DATABASE_URL = process.env.DATABASE_URL;

	if (!DATABASE_URL) {
		throw new Error('DATABASE_URL environment variable is not set');
	}

	const client = postgres(DATABASE_URL);
	const db = drizzle(client);

	console.log('🧹 Resetting database...');

	// Reset only the tables we want to seed, not auth tables
	await reset(db, {
		user: schema.user,
		events: schema.events,
		eventUser: schema.eventUser,
		eventMagicLinks: schema.eventMagicLinks,
		schedules: schema.schedules
	});

	console.log('🌱 Seeding database...');

	// Only seed the tables we care about, not auth tables
	await seed(db, {
		user: schema.user,
		events: schema.events,
		eventUser: schema.eventUser,
		eventMagicLinks: schema.eventMagicLinks,
		schedules: schema.schedules
	}).refine((f) => ({
		user: {
			count: 10,
			columns: {
				id: f.string({ isUnique: true }),
				name: f.fullName(),
				email: f.email(),
				emailVerified: f.boolean(),
				image: f.default({ defaultValue: null })
			}
		},
		events: {
			count: 50,
			columns: {
				id: f.string({ isUnique: true }),
				name: f.companyName(),
				location: f.city(),
				description: f.loremIpsum({ sentencesCount: 3 }),
				picture: f.default({ defaultValue: null }),
				pictureWidth: f.default({ defaultValue: null }),
				pictureHeight: f.default({ defaultValue: null }),
				// Generate dates: 50% in the past, 50% in the future
				startDate: f.weightedRandom([
					{
						weight: 0.5,
						value: f.date({ minDate: '2023-01-01', maxDate: '2024-12-31' })
					},
					{
						weight: 0.5,
						value: f.date({ minDate: '2025-01-01', maxDate: '2026-12-31' })
					}
				]),
				endDate: f.weightedRandom([
					{
						weight: 0.5,
						value: f.date({ minDate: '2023-01-01', maxDate: '2024-12-31' })
					},
					{
						weight: 0.5,
						value: f.date({ minDate: '2025-01-01', maxDate: '2026-12-31' })
					}
				])
			},
			with: {
				schedules: [
					{ weight: 0.3, count: [1, 2] },
					{ weight: 0.5, count: [3, 4, 5] },
					{ weight: 0.2, count: [6, 7, 8] }
				],
				eventUser: [
					{ weight: 0.4, count: [1, 2, 3] },
					{ weight: 0.4, count: [4, 5, 6] },
					{ weight: 0.2, count: [7, 8, 9, 10] }
				]
			}
		},
		eventUser: {
			columns: {
				status: f.valuesFromArray({
					values: ['pending', 'confirmed', 'declined', 'maybe']
				})
			}
		},
		schedules: {
			columns: {
				id: f.string({ isUnique: true }),
				name: f.jobTitle(),
				description: f.loremIpsum({ sentencesCount: 2 }),
				location: f.streetAddress(),
				longitude: f.number({ minValue: -180, maxValue: 180, precision: 1000000 }),
				latitude: f.number({ minValue: -90, maxValue: 90, precision: 1000000 }),
				startDate: f.date({ minDate: '2024-01-01', maxDate: '2026-12-31' }),
				endDate: f.date({ minDate: '2024-01-01', maxDate: '2026-12-31' })
			}
		},
		eventMagicLinks: {
			columns: {
				id: f.string({ isUnique: true }),
				expiresAt: f.date({ minDate: '2025-01-01', maxDate: '2026-12-31' })
			}
		}
	}));

	console.log('✅ Database seeded successfully!');
	await client.end();
}

main().catch((error) => {
	console.error('❌ Seeding failed:', error);
	process.exit(1);
});
