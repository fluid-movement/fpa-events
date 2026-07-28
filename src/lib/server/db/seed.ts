import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { ulid } from 'ulid';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function id() {
	return ulid().toLowerCase();
}

function date(str: string) {
	return new Date(str);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = 'zaharias.andre@googlemail.com';

// `showAttendance: false` opts a user out of being named publicly — they still
// count towards an event's attendee total. A few are seeded opted-out so the
// "and N others" path is exercised locally.
const users = [
	{ id: id(), name: 'Andre Zaharias', email: ADMIN_EMAIL, role: 'admin' as const },
	{
		id: id(),
		name: 'Juliana Vasquez',
		email: 'juliana.vasquez@example.com',
		role: 'user' as const
	},
	{
		id: id(),
		name: 'Marcus Hellström',
		email: 'marcus.h@example.com',
		role: 'user' as const,
		showAttendance: false
	},
	{ id: id(), name: 'Priya Nair', email: 'priya.nair@example.com', role: 'user' as const },
	{ id: id(), name: 'Tom Leitner', email: 'tom.leitner@example.com', role: 'user' as const },
	{
		id: id(),
		name: 'Sofía Reyes',
		email: 'sofia.reyes@example.com',
		role: 'user' as const,
		showAttendance: false
	},
	{ id: id(), name: 'Kenji Tanaka', email: 'kenji.tanaka@example.com', role: 'user' as const },
	{ id: id(), name: 'Elise Bonnet', email: 'elise.bonnet@example.com', role: 'user' as const },
	{ id: id(), name: 'Dmitri Volkov', email: 'dmitri.volkov@example.com', role: 'user' as const },
	{ id: id(), name: 'Nadia Al-Amin', email: 'nadia.alamin@example.com', role: 'user' as const },
	{ id: id(), name: 'Cody Fletcher', email: 'cody.fletcher@example.com', role: 'user' as const },
	{ id: id(), name: 'Lena Brandt', email: 'lena.brandt@example.com', role: 'user' as const },
	{ id: id(), name: 'Rafael Costa', email: 'rafael.costa@example.com', role: 'user' as const },
	{ id: id(), name: 'Yuki Shimizu', email: 'yuki.shimizu@example.com', role: 'user' as const },
	{
		id: id(),
		name: 'Fatima Ouedraogo',
		email: 'fatima.o@example.com',
		role: 'user' as const,
		showAttendance: false
	}
];

// ---------------------------------------------------------------------------
// Event locations (city-level, deduplicated across events)
// ---------------------------------------------------------------------------

type LocationSeed = { city: string; country: string; latitude: number; longitude: number };

const EVENT_LOCATIONS: LocationSeed[] = [
	{ city: 'Portland', country: 'USA', latitude: 45.5231, longitude: -122.6765 },
	{ city: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041 },
	{ city: 'Berlin', country: 'Germany', latitude: 52.52, longitude: 13.405 },
	{ city: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503 },
	{ city: 'Geneva', country: 'Switzerland', latitude: 46.2044, longitude: 6.1432 },
	{ city: 'Gothenburg', country: 'Sweden', latitude: 57.7089, longitude: 11.9746 },
	{ city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278 },
	{ city: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
	{ city: 'Barcelona', country: 'Spain', latitude: 41.3851, longitude: 2.1734 },
	{ city: 'São Paulo', country: 'Brazil', latitude: -23.5505, longitude: -46.6333 },
	{ city: 'Vienna', country: 'Austria', latitude: 48.2082, longitude: 16.3738 },
	{ city: 'Montreal', country: 'Canada', latitude: 45.5017, longitude: -73.5673 },
	{ city: 'Brighton', country: 'UK', latitude: 50.8229, longitude: -0.1363 },
	{ city: 'Helsinki', country: 'Finland', latitude: 60.1699, longitude: 24.9384 },
	{ city: 'Seoul', country: 'South Korea', latitude: 37.5665, longitude: 126.978 },
	{ city: 'Cape Town', country: 'South Africa', latitude: -33.9249, longitude: 18.4241 },
	{ city: 'Lisbon', country: 'Portugal', latitude: 38.7223, longitude: -9.1393 },
	{ city: 'Melbourne', country: 'Australia', latitude: -37.8136, longitude: 144.9631 }
];

function locationKey(city: string, country: string) {
	return `${city}|${country}`;
}

// ---------------------------------------------------------------------------
// Events (reference locations by city/country key, resolved to ID after insert)
// ---------------------------------------------------------------------------

type EventSeed = Omit<
	typeof schema.events.$inferInsert,
	'userId' | 'eventLocationId' | 'createdAt' | 'updatedAt'
> & {
	locationCity: string;
	locationCountry: string;
};

const eventSeeds: EventSeed[] = [
	// --- 2023 past events ---
	{
		id: id(),
		name: 'FPA World Championship 2023',
		location: 'Portland, Oregon, USA',
		locationCity: 'Portland',
		locationCountry: 'USA',
		startDate: date('2023-08-10'),
		endDate: date('2023-08-13'),
		description: `<p>The annual FPA World Championship brought together the best freestyle disc players from around the globe. Four days of open pairs, mixed pairs, coop, and individual competition, culminating in an unforgettable finals night.</p>`,
		picture: 'https://picsum.photos/seed/fpa-world-2023/1600/700',
		pictureWidth: 1600,
		pictureHeight: 700
	},
	{
		id: id(),
		name: 'European Open 2023',
		location: 'Amsterdam, Netherlands',
		locationCity: 'Amsterdam',
		locationCountry: 'Netherlands',
		startDate: date('2023-05-19'),
		endDate: date('2023-05-21'),
		description: `<p>Three days of freestyle competition in the heart of Amsterdam. The European Open drew competitors from over 20 countries, with fierce competition in all divisions.</p>`,
		picture: 'https://picsum.photos/seed/euro-open-2023/1200/800',
		pictureWidth: 1200,
		pictureHeight: 800
	},
	{
		id: id(),
		name: 'Berlin Summer Jam 2023',
		location: 'Berlin, Germany',
		locationCity: 'Berlin',
		locationCountry: 'Germany',
		startDate: date('2023-07-01'),
		endDate: date('2023-07-02'),
		description: `<p>A classic summer jam in Tempelhof Park. Relaxed format, great vibes, open to all skill levels. Bring your disc and your friends.</p>`,
		picture: 'https://picsum.photos/seed/berlin-jam-2023/1200/675',
		pictureWidth: 1200,
		pictureHeight: 675
	},
	{
		id: id(),
		name: 'Asia-Pacific Freestyle Open 2023',
		location: 'Tokyo, Japan',
		locationCity: 'Tokyo',
		locationCountry: 'Japan',
		startDate: date('2023-09-22'),
		endDate: date('2023-09-24'),
		description: `<p>The first major freestyle disc event in Japan drew competitors from across Asia and the Pacific. An incredible atmosphere with performances that wowed both judges and spectators.</p>`,
		picture: 'https://picsum.photos/seed/apac-2023/1200/900',
		pictureWidth: 1200,
		pictureHeight: 900
	},
	{
		id: id(),
		name: 'Geneva Disc Festival 2023',
		location: 'Geneva, Switzerland',
		locationCity: 'Geneva',
		locationCountry: 'Switzerland',
		startDate: date('2023-06-09'),
		endDate: date('2023-06-11'),
		description: `<p>Switzerland's premier disc festival, set against the backdrop of Lake Geneva. Freestyle competitions during the day, disc golf in the mornings, and live music in the evenings.</p>`
		// no picture — test the no-image state
	},

	// --- 2024 past events ---
	{
		id: id(),
		name: 'FPA World Championship 2024',
		location: 'Gothenburg, Sweden',
		locationCity: 'Gothenburg',
		locationCountry: 'Sweden',
		startDate: date('2024-08-08'),
		endDate: date('2024-08-11'),
		description: `<p>Gothenburg hosted the 2024 World Championship, marking the first time Sweden has held the event. Spectacular performances throughout the week with a record number of registered competitors.</p>`,
		picture: 'https://picsum.photos/seed/fpa-world-2024/1600/600',
		pictureWidth: 1600,
		pictureHeight: 600
	},
	{
		id: id(),
		name: 'Spring Fling Portland 2024',
		location: 'Portland, Oregon, USA',
		locationCity: 'Portland',
		locationCountry: 'USA',
		startDate: date('2024-04-13'),
		endDate: date('2024-04-14'),
		description: `<p>A beloved annual tradition in Portland's waterfront parks. The Spring Fling focuses on co-op and pairs, with a relaxed judging format designed to welcome newcomers.</p>`,
		picture: 'https://picsum.photos/seed/spring-fling-2024/1200/675',
		pictureWidth: 1200,
		pictureHeight: 675
	},
	{
		id: id(),
		name: 'London Freestyle Meetup 2024',
		location: 'London, UK',
		locationCity: 'London',
		locationCountry: 'UK',
		startDate: date('2024-03-23'),
		endDate: date('2024-03-23'),
		description: `<p>A one-day meetup in Hyde Park, organised by the London freestyle community. Drop in, throw some disc, and connect with players from around the UK.</p>`
		// no picture — test the no-image state
	},
	{
		id: id(),
		name: 'Parc des Princes Open 2024',
		location: 'Paris, France',
		locationCity: 'Paris',
		locationCountry: 'France',
		startDate: date('2024-06-14'),
		endDate: date('2024-06-16'),
		description: `<p>Held in the beautiful Parc des Princes grounds, this Paris Open brought together some of Europe's finest freestylers for a weekend of competition and workshops.</p>`,
		picture: 'https://picsum.photos/seed/paris-open-2024/1200/800',
		pictureWidth: 1200,
		pictureHeight: 800
	},
	{
		id: id(),
		name: 'Barcelona Beach Jam 2024',
		location: 'Barcelona, Spain',
		locationCity: 'Barcelona',
		locationCountry: 'Spain',
		startDate: date('2024-07-19'),
		endDate: date('2024-07-20'),
		description: `<p>Sand, sun, and spinning discs on the beach in Barcelona. A casual two-day beach jam with an optional pairs competition on Sunday afternoon.</p>`,
		picture: 'https://picsum.photos/seed/barcelona-2024/1600/500',
		pictureWidth: 1600,
		pictureHeight: 500
	},
	{
		id: id(),
		name: 'São Paulo Freestyle Open 2024',
		location: 'São Paulo, Brazil',
		locationCity: 'São Paulo',
		locationCountry: 'Brazil',
		startDate: date('2024-10-04'),
		endDate: date('2024-10-06'),
		description: `<p>South America's biggest freestyle disc event returned to São Paulo with a packed schedule of competitions, clinics, and a spectacular exhibition show.</p>`,
		picture: 'https://picsum.photos/seed/sao-paulo-2024/1200/675',
		pictureWidth: 1200,
		pictureHeight: 675
	},
	{
		id: id(),
		name: 'Vienna Autumn Classic 2024',
		location: 'Vienna, Austria',
		locationCity: 'Vienna',
		locationCountry: 'Austria',
		startDate: date('2024-11-01'),
		endDate: date('2024-11-03'),
		description: `<p>An indoor autumn classic held in Vienna's sports complex. The Vienna Classic is known for its high technical level and tight, competitive open pairs divisions.</p>`,
		picture: 'https://picsum.photos/seed/vienna-2024/1200/900',
		pictureWidth: 1200,
		pictureHeight: 900
	},

	// --- 2025 events ---
	{
		id: id(),
		name: 'FPA World Championship 2025',
		location: 'Montreal, Canada',
		locationCity: 'Montreal',
		locationCountry: 'Canada',
		startDate: date('2025-08-07'),
		endDate: date('2025-08-10'),
		description: `<p>Montreal welcomed the world for the 2025 FPA World Championship. A spectacular venue in Parc Jean-Drapeau and record-breaking attendance made this one for the history books.</p>`,
		picture: 'https://picsum.photos/seed/fpa-world-2025/1600/700',
		pictureWidth: 1600,
		pictureHeight: 700
	},
	{
		id: id(),
		name: 'Geneva Spring Classic 2025',
		location: 'Geneva, Switzerland',
		locationCity: 'Geneva',
		locationCountry: 'Switzerland',
		startDate: date('2025-05-02'),
		endDate: date('2025-05-04'),
		description: `<p>The Geneva Spring Classic returns with a full schedule of pairs and co-op divisions. Set along the lakefront with a view of the Alps, this is one of Europe's most scenic events.</p>`,
		picture: 'https://picsum.photos/seed/geneva-sc-2025/1200/800',
		pictureWidth: 1200,
		pictureHeight: 800
	},
	{
		id: id(),
		name: 'Tokyo Winter Jam 2025',
		location: 'Tokyo, Japan',
		locationCity: 'Tokyo',
		locationCountry: 'Japan',
		startDate: date('2025-02-15'),
		endDate: date('2025-02-16'),
		description: `<p>An indoor winter jam organised by the Tokyo Freestyle Club. Short routines, a laid-back atmosphere, and great food make this a highlight of the winter calendar.</p>`,
		picture: 'https://picsum.photos/seed/tokyo-jam-2025/1200/675',
		pictureWidth: 1200,
		pictureHeight: 675
	},
	{
		id: id(),
		name: 'UK Freestyle Open 2025',
		location: 'Brighton, UK',
		locationCity: 'Brighton',
		locationCountry: 'UK',
		startDate: date('2025-07-12'),
		endDate: date('2025-07-13'),
		description: `<p>Brighton's seafront is the backdrop for the annual UK Freestyle Open. Open pairs and mixed pairs divisions, with a Sunday evening exhibition on the promenade.</p>`,
		picture: 'https://picsum.photos/seed/uk-open-2025/1600/600',
		pictureWidth: 1600,
		pictureHeight: 600
	},
	{
		id: id(),
		name: 'Autumn Disc Festival Berlin 2025',
		location: 'Berlin, Germany',
		locationCity: 'Berlin',
		locationCountry: 'Germany',
		startDate: date('2025-10-10'),
		endDate: date('2025-10-12'),
		description: `<p>Berlin's iconic autumn festival is back with competitions, workshops by top players, and the legendary Saturday evening jam session in Volkspark Friedrichshain.</p>`,
		picture: 'https://picsum.photos/seed/berlin-autumn-2025/1200/900',
		pictureWidth: 1200,
		pictureHeight: 900
	},
	{
		id: id(),
		name: 'Melbourne Summer Open 2025',
		location: 'Melbourne, Australia',
		locationCity: 'Melbourne',
		locationCountry: 'Australia',
		startDate: date('2025-12-06'),
		endDate: date('2025-12-07'),
		description: `<p>The Southern Hemisphere summer kicks off with the Melbourne Open, held in the Royal Botanic Gardens. Australia's top freestylers battle it out in an open pairs format.</p>`,
		picture: 'https://picsum.photos/seed/melbourne-2025/1200/675',
		pictureWidth: 1200,
		pictureHeight: 675
	},

	// --- 2026 upcoming events ---
	{
		id: id(),
		name: 'FPA World Championship 2026',
		location: 'Geneva, Switzerland',
		locationCity: 'Geneva',
		locationCountry: 'Switzerland',
		startDate: date('2026-08-06'),
		endDate: date('2026-08-09'),
		description: `<p>The 2026 World Championship comes to Geneva — a true highlight of the freestyle calendar. Four divisions, hundreds of competitors, and the most spectacular setting in the event's history. Registration opens in March 2026.</p>`,
		picture: 'https://picsum.photos/seed/fpa-world-2026/1600/700',
		pictureWidth: 1600,
		pictureHeight: 700
	},
	{
		id: id(),
		name: 'Geneva Spring Classic 2026',
		location: 'Geneva, Switzerland',
		locationCity: 'Geneva',
		locationCountry: 'Switzerland',
		startDate: date('2026-05-08'),
		endDate: date('2026-05-10'),
		description: `<p>The traditional warm-up event for the Swiss freestyle season. The Spring Classic features full open pairs, mixed pairs, and co-op divisions, with a relaxed side event for newcomers.</p>`,
		picture: 'https://picsum.photos/seed/geneva-sc-2026/1200/800',
		pictureWidth: 1200,
		pictureHeight: 800
	},
	{
		id: id(),
		name: 'Lisbon Freestyle Weekend 2026',
		location: 'Lisbon, Portugal',
		locationCity: 'Lisbon',
		locationCountry: 'Portugal',
		startDate: date('2026-04-17'),
		endDate: date('2026-04-19'),
		description: `<p>Lisbon hosts its first ever major freestyle disc event. Three days of competition, workshops, and evening socials in one of Europe's most vibrant cities.</p>`,
		picture: 'https://picsum.photos/seed/lisbon-2026/1200/675',
		pictureWidth: 1200,
		pictureHeight: 675
	},
	{
		id: id(),
		name: 'PDX Spring Fling 2026',
		location: 'Portland, Oregon, USA',
		locationCity: 'Portland',
		locationCountry: 'USA',
		startDate: date('2026-04-11'),
		endDate: date('2026-04-12'),
		description: `<p>Portland's beloved spring jam returns to the waterfront. All skill levels welcome; co-op and pairs format with beginner-friendly judging clinics on Saturday morning.</p>`,
		picture: 'https://picsum.photos/seed/pdx-fling-2026/1600/600',
		pictureWidth: 1600,
		pictureHeight: 600
	},
	{
		id: id(),
		name: 'Berlin Summer Jam 2026',
		location: 'Berlin, Germany',
		locationCity: 'Berlin',
		locationCountry: 'Germany',
		startDate: date('2026-07-04'),
		endDate: date('2026-07-05'),
		description: `<p>Tempelhof Park once again hosts the Berlin Summer Jam — a staple of the European freestyle summer. Free to enter, open to all, and guaranteed good vibes.</p>`
		// no picture — test the no-image state
	},
	{
		id: id(),
		name: 'Nordic Open 2026',
		location: 'Helsinki, Finland',
		locationCity: 'Helsinki',
		locationCountry: 'Finland',
		startDate: date('2026-06-20'),
		endDate: date('2026-06-21'),
		description: `<p>The Nordic Open makes its debut in Helsinki on the longest days of the year. Open pairs competition with a midnight sun jam session on Saturday evening.</p>`,
		picture: 'https://picsum.photos/seed/nordic-2026/1600/500',
		pictureWidth: 1600,
		pictureHeight: 500
	},
	{
		id: id(),
		name: 'Seoul Disc Classic 2026',
		location: 'Seoul, South Korea',
		locationCity: 'Seoul',
		locationCountry: 'South Korea',
		startDate: date('2026-09-19'),
		endDate: date('2026-09-20'),
		description: `<p>The Seoul Disc Classic returns for its third edition. Two days of competitive freestyle in the heart of the city, with a growing community of Korean freestylers at the forefront.</p>`,
		picture: 'https://picsum.photos/seed/seoul-2026/1200/800',
		pictureWidth: 1200,
		pictureHeight: 800
	},
	{
		id: id(),
		name: 'Cape Town Open 2026',
		location: 'Cape Town, South Africa',
		locationCity: 'Cape Town',
		locationCountry: 'South Africa',
		startDate: date('2026-11-14'),
		endDate: date('2026-11-15'),
		description: `<p>Africa's premier freestyle disc event, held at a beachfront venue with Table Mountain as the backdrop. An unforgettable setting for a world-class competition.</p>`,
		picture: 'https://picsum.photos/seed/capetown-2026/1200/900',
		pictureWidth: 1200,
		pictureHeight: 900
	}
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const DATABASE_URL = process.env.DATABASE_URL;
	if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const client = postgres(DATABASE_URL);
	const db = drizzle(client, { schema });

	console.log('🧹 Clearing existing data...');

	// Delete in FK-safe order (children before parents; SET NULL relations last)
	await db.delete(schema.schedules);
	await db.delete(schema.scheduleLocations);
	await db.delete(schema.eventMagicLinks);
	await db.delete(schema.eventUser);
	await db.delete(schema.events);
	await db.delete(schema.eventLocations);
	// Preserve any real user accounts by only deleting example.com seed users and the admin
	await db.delete(schema.user).where(sql`email LIKE '%@example.com' OR email = ${ADMIN_EMAIL}`);

	console.log('👤 Seeding users...');

	const insertedUsers = await db
		.insert(schema.user)
		.values(
			users.map((u) => ({
				id: u.id,
				name: u.name,
				email: u.email,
				emailVerified: true,
				role: u.role,
				showAttendance: u.showAttendance ?? true,
				createdAt: new Date(),
				updatedAt: new Date()
			}))
		)
		.onConflictDoUpdate({
			target: schema.user.email,
			set: {
				name: sql`excluded.name`,
				role: sql`excluded.role`,
				showAttendance: sql`excluded.show_attendance`
			}
		})
		.returning();

	const userIds = insertedUsers.map((u) => u.id);
	const adminId = insertedUsers.find((u) => u.email === ADMIN_EMAIL)!.id;

	console.log('📍 Seeding event locations...');

	const insertedLocations = await db
		.insert(schema.eventLocations)
		.values(EVENT_LOCATIONS)
		.returning();

	// Build lookup map: "City|Country" → id
	const locationIdMap = new Map<string, number>(
		insertedLocations.map((l) => [locationKey(l.city, l.country), l.id])
	);

	console.log('📅 Seeding events...');

	// Assign organizers: admin creates the big championships, others share the rest
	const eventsToInsert = eventSeeds.map((evt, i) => {
		const { locationCity, locationCountry, ...rest } = evt;
		return {
			...rest,
			userId: i % 5 === 0 ? adminId : userIds[i % userIds.length],
			eventLocationId: locationIdMap.get(locationKey(locationCity, locationCountry)) ?? null,
			createdAt: new Date(),
			updatedAt: new Date()
		};
	});

	const insertedEvents = await db.insert(schema.events).values(eventsToInsert).returning();

	// Build a name → event map for schedule wiring
	const eventByName = new Map(insertedEvents.map((e) => [e.name, e]));

	console.log('🏟️  Seeding schedule locations...');

	const worldChamp2026 = eventByName.get('FPA World Championship 2026');
	const worldChamp2025 = eventByName.get('FPA World Championship 2025');
	const genevaSC2026 = eventByName.get('Geneva Spring Classic 2026');

	type ScheduleLocationInsert = typeof schema.scheduleLocations.$inferInsert;

	const scheduleLocationSeeds: ScheduleLocationInsert[] = [
		// World Championship 2026 venues (Geneva)
		...(worldChamp2026
			? [
					{
						eventId: worldChamp2026.id,
						name: 'Main Competition Field',
						address: 'Quai du Mont-Blanc, Geneva',
						latitude: 46.2085,
						longitude: 6.1464
					},
					{
						eventId: worldChamp2026.id,
						name: 'Registration Tent',
						address: 'Jardin Anglais, Geneva',
						latitude: 46.2044,
						longitude: 6.1527
					},
					{
						// Name-only venue: coordinates are optional.
						eventId: worldChamp2026.id,
						name: 'Warm-up Area',
						address: null,
						latitude: null,
						longitude: null
					}
				]
			: []),
		// World Championship 2025 venues (Montreal)
		...(worldChamp2025
			? [
					{
						eventId: worldChamp2025.id,
						name: 'Parc Jean-Drapeau Field',
						address: 'Île Notre-Dame, Montreal',
						latitude: 45.5088,
						longitude: -73.5332
					}
				]
			: []),
		// Geneva Spring Classic 2026 venues
		...(genevaSC2026
			? [
					{
						eventId: genevaSC2026.id,
						name: 'Lakefront Field',
						address: 'Quai Gustave-Ador, Geneva',
						latitude: 46.2074,
						longitude: 6.1571
					}
				]
			: [])
	];

	const insertedScheduleLocations =
		scheduleLocationSeeds.length > 0
			? await db.insert(schema.scheduleLocations).values(scheduleLocationSeeds).returning()
			: [];

	// Build lookup: eventId + name → scheduleLocation id
	const schedLocByEventAndName = new Map(
		insertedScheduleLocations.map((sl) => [`${sl.eventId}|${sl.name}`, sl.id])
	);

	console.log('🗓️  Seeding schedules...');

	type ScheduleRow = typeof schema.schedules.$inferInsert;

	function makeSchedule(
		eventId: string,
		items: (Omit<ScheduleRow, 'id' | 'eventId'> & { locationName?: string })[]
	): ScheduleRow[] {
		return items.map(({ locationName, ...item }) => ({
			id: id(),
			eventId,
			...item,
			locationId: locationName
				? (schedLocByEventAndName.get(`${eventId}|${locationName}`) ?? null)
				: null
		}));
	}

	const schedules: ScheduleRow[] = [
		...(worldChamp2026
			? makeSchedule(worldChamp2026.id, [
					{
						name: 'Registration & Practice',
						startDate: date('2026-08-06T09:00:00'),
						endDate: date('2026-08-06T18:00:00'),
						description: `<p>Check in, collect your badge, and get some practice throws in before competition begins.</p>`,
						locationName: 'Registration Tent'
					},
					{
						name: 'Open Pairs — Prelims',
						startDate: date('2026-08-07T09:00:00'),
						endDate: date('2026-08-07T18:00:00'),
						description: `<p>Preliminary rounds for Open Pairs. All registered teams compete.</p>`,
						locationName: 'Main Competition Field'
					},
					{
						name: 'Mixed Pairs & Co-op — Prelims',
						startDate: date('2026-08-08T09:00:00'),
						endDate: date('2026-08-08T18:00:00'),
						description: `<p>Preliminary rounds for Mixed Pairs and Co-op divisions.</p>`,
						locationName: 'Main Competition Field'
					},
					{
						name: 'Finals Night',
						startDate: date('2026-08-09T17:00:00'),
						endDate: date('2026-08-09T22:00:00'),
						description: `<p>The top teams from each division compete for the World Championship titles. Open to the public.</p>`,
						locationName: 'Main Competition Field'
					}
				])
			: []),

		...(worldChamp2025
			? makeSchedule(worldChamp2025.id, [
					{
						name: 'Registration Day',
						startDate: date('2025-08-07T09:00:00'),
						endDate: date('2025-08-07T17:00:00'),
						description: `<p>Registration, practice fields open, welcome reception in the evening.</p>`,
						locationName: 'Parc Jean-Drapeau Field'
					},
					{
						name: 'Prelims — Day 1',
						startDate: date('2025-08-08T09:00:00'),
						endDate: date('2025-08-08T18:00:00'),
						description: `<p>Open Pairs and Mixed Pairs preliminary rounds.</p>`,
						locationName: 'Parc Jean-Drapeau Field'
					},
					{
						name: 'Prelims — Day 2',
						startDate: date('2025-08-09T09:00:00'),
						endDate: date('2025-08-09T18:00:00'),
						description: `<p>Co-op and Individual preliminary rounds. Semi-finals for Pairs.</p>`,
						locationName: 'Parc Jean-Drapeau Field'
					},
					{
						name: 'Finals',
						startDate: date('2025-08-10T16:00:00'),
						endDate: date('2025-08-10T21:00:00'),
						description: `<p>Finals for all divisions. Award ceremony follows.</p>`,
						locationName: 'Parc Jean-Drapeau Field'
					}
				])
			: []),

		...(genevaSC2026
			? makeSchedule(genevaSC2026.id, [
					{
						name: 'Day 1 — Pairs Prelims',
						startDate: date('2026-05-08T10:00:00'),
						endDate: date('2026-05-08T18:00:00'),
						description: `<p>Open Pairs and Mixed Pairs preliminary rounds.</p>`,
						locationName: 'Lakefront Field'
					},
					{
						name: 'Day 2 — Co-op & Semis',
						startDate: date('2026-05-09T10:00:00'),
						endDate: date('2026-05-09T18:00:00'),
						description: `<p>Co-op prelims and semi-finals for all divisions.</p>`,
						locationName: 'Lakefront Field'
					},
					{
						name: 'Day 3 — Finals',
						startDate: date('2026-05-10T14:00:00'),
						endDate: date('2026-05-10T19:00:00'),
						description: `<p>Finals for all divisions, followed by an open jam session.</p>`,
						locationName: 'Lakefront Field'
					}
				])
			: [])
	];

	if (schedules.length) {
		await db.insert(schema.schedules).values(schedules);
	}

	console.log('🎟️  Seeding RSVPs...');

	const rsvps: (typeof schema.eventUser.$inferInsert)[] = [];

	for (const evt of insertedEvents) {
		// Creator is always organizing
		rsvps.push({
			eventId: evt.id,
			userId: evt.userId,
			status: 'organizing',
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Spread a random subset of other users as attendees (3–10 people)
		const attendeeCount = 3 + Math.floor(Math.random() * 8);
		const otherUsers = userIds.filter((uid) => uid !== evt.userId);
		const shuffled = [...otherUsers].sort(() => Math.random() - 0.5);

		for (const userId of shuffled.slice(0, attendeeCount)) {
			rsvps.push({
				eventId: evt.id,
				userId,
				status: 'attending',
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}
	}

	await db.insert(schema.eventUser).values(rsvps);

	const organizingCount = rsvps.filter((r) => r.status === 'organizing').length;
	const attendingCount = rsvps.filter((r) => r.status === 'attending').length;

	console.log(
		`✅ Done! Seeded ${insertedUsers.length} users, ${insertedLocations.length} locations, ` +
			`${insertedEvents.length} events, ${insertedScheduleLocations.length} schedule locations, ` +
			`${schedules.length} schedule items, ${organizingCount} organizers, ${attendingCount} attendees.`
	);

	await client.end();
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
