import { drizzle } from 'drizzle-orm/better-sqlite3';
import { seed } from 'drizzle-seed';
import Database from 'better-sqlite3';
import * as schema from '../src/lib/server/db/schema';

async function main() {
	console.log('🌱 Starting database seeding...\n');

	const sqlite = new Database('./local.db');
	const db = drizzle(sqlite, { schema });

	console.log('🎲 Seeding database with realistic data...\n');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await seed(db as any, schema, { seed: 42 }).refine((f) => ({
		users: {
			count: 100,
			columns: {
				name: f.fullName(),
				email: f.email(),
				password: f.default({
					defaultValue: '$2a$10$YourHashedPasswordHere'
				}),
				role: f.weightedRandom([
					{ weight: 0.9, value: f.valuesFromArray({ values: ['user'] }) },
					{ weight: 0.1, value: f.valuesFromArray({ values: ['admin'] }) }
				]),
				emailVerifiedAt: f.weightedRandom([
					{
						weight: 0.8,
						value: f.date({
							minDate: '2023-01-01',
							maxDate: '2024-12-31'
						})
					},
					{ weight: 0.2, value: f.default({ defaultValue: null }) }
				])
			}
		},

		events: {
			count: 50,
			columns: {
				name: f.valuesFromArray({
					values: [
						'Annual Conference',
						'Team Building Workshop',
						'Product Launch',
						'Networking Mixer',
						'Training Session',
						'Company Retreat',
						'Community Meetup',
						'Hackathon',
						'Awards Ceremony',
						'Holiday Party'
					]
				}),
				location: f.valuesFromArray({
					values: [
						'Convention Center, Downtown',
						'Tech Hub Auditorium',
						'City Hotel Grand Ballroom',
						'Community Center',
						'Corporate Headquarters',
						'Riverside Park Pavilion',
						'Innovation Lab',
						'Startup Campus',
						'Virtual (Online)',
						'Conference Room A, Building 5'
					]
				}),
				description: f.loremIpsum(),
				startDate: f.date({
					minDate: '2024-01-01',
					maxDate: '2024-12-31'
				}),
				endDate: f.date({
					minDate: '2024-01-01',
					maxDate: '2024-12-31'
				}),
				picture: f.weightedRandom([
					{ weight: 0.3, value: f.default({ defaultValue: null }) },
					{
						weight: 0.7,
						value: f.valuesFromArray({
							values: [
								'/images/event-1.jpg',
								'/images/event-2.jpg',
								'/images/event-3.jpg',
								'/images/event-4.jpg'
							]
						})
					}
				]),
				pictureWidth: f.weightedRandom([
					{ weight: 0.3, value: f.default({ defaultValue: null }) },
					{ weight: 0.7, value: f.int({ minValue: 800, maxValue: 1920 }) }
				]),
				pictureHeight: f.weightedRandom([
					{ weight: 0.3, value: f.default({ defaultValue: null }) },
					{ weight: 0.7, value: f.int({ minValue: 600, maxValue: 1080 }) }
				])
			},
			with: {
				schedules: [
					{ weight: 0.3, count: [2] },
					{ weight: 0.4, count: [3] },
					{ weight: 0.2, count: [4] },
					{ weight: 0.1, count: [5] }
				],
				eventMagicLinks: [
					{ weight: 0.7, count: [1] },
					{ weight: 0.3, count: [2] }
				]
			}
		},

		schedules: {
			columns: {
				name: f.valuesFromArray({
					values: [
						'Opening Keynote',
						'Morning Session',
						'Lunch Break',
						'Afternoon Workshop',
						'Panel Discussion',
						'Networking Session',
						'Closing Remarks',
						'Q&A Session',
						'Team Activity',
						'Break'
					]
				}),
				description: f.weightedRandom([
					{ weight: 0.3, value: f.default({ defaultValue: null }) },
					{ weight: 0.7, value: f.loremIpsum() }
				]),
				location: f.weightedRandom([
					{ weight: 0.2, value: f.default({ defaultValue: null }) },
					{
						weight: 0.8,
						value: f.valuesFromArray({
							values: [
								'Main Hall',
								'Room A',
								'Room B',
								'Auditorium',
								'Cafeteria',
								'Outdoor Area',
								'Virtual Room 1'
							]
						})
					}
				]),
				startDate: f.date({
					minDate: '2024-01-01',
					maxDate: '2024-12-31'
				}),
				endDate: f.date({
					minDate: '2024-01-01',
					maxDate: '2024-12-31'
				}),
				longitude: f.weightedRandom([
					{ weight: 0.5, value: f.default({ defaultValue: null }) },
					{
						weight: 0.5,
						value: f.number({ minValue: -180, maxValue: 180, precision: 1000000 })
					}
				]),
				latitude: f.weightedRandom([
					{ weight: 0.5, value: f.default({ defaultValue: null }) },
					{ weight: 0.5, value: f.number({ minValue: -90, maxValue: 90, precision: 1000000 }) }
				])
			}
		},

		eventMagicLinks: {
			columns: {
				expiresAt: f.date({
					minDate: '2024-06-01',
					maxDate: '2025-12-31'
				})
			}
		},

		eventUser: {
			count: 300,
			columns: {
				status: f.weightedRandom([
					{ weight: 0.5, value: f.valuesFromArray({ values: ['confirmed'] }) },
					{ weight: 0.2, value: f.valuesFromArray({ values: ['pending'] }) },
					{ weight: 0.2, value: f.valuesFromArray({ values: ['maybe'] }) },
					{ weight: 0.1, value: f.valuesFromArray({ values: ['declined'] }) }
				])
			}
		}
	}));

	sqlite.close();

	console.log('✅ Database seeded successfully!\n');
	console.log('📊 Summary:');
	console.log('   - 100 users (90% regular users, 10% admins)');
	console.log('   - 50 events with descriptions and locations');
	console.log('   - 2-5 schedules per event (~150-250 schedules)');
	console.log('   - 1-2 magic links per event');
	console.log('   - 300 event-user relationships with various statuses');
	console.log('\n🎉 You can now start Drizzle Studio to explore your data!');
}

main().catch((error) => {
	console.error('❌ Seeding failed:', error);
	process.exit(1);
});
