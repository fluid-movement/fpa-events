import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { ulid } from 'ulid';
import * as schema from './schema';
import { eq, sql } from 'drizzle-orm';

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

const users = [
	{ id: id(), name: 'Andre Zaharias', email: ADMIN_EMAIL, role: 'admin' as const },
	{ id: id(), name: 'Juliana Vasquez', email: 'juliana.vasquez@example.com', role: 'user' as const },
	{ id: id(), name: 'Marcus Hellström', email: 'marcus.h@example.com', role: 'user' as const },
	{ id: id(), name: 'Priya Nair', email: 'priya.nair@example.com', role: 'user' as const },
	{ id: id(), name: 'Tom Leitner', email: 'tom.leitner@example.com', role: 'user' as const },
	{ id: id(), name: 'Sofía Reyes', email: 'sofia.reyes@example.com', role: 'user' as const },
	{ id: id(), name: 'Kenji Tanaka', email: 'kenji.tanaka@example.com', role: 'user' as const },
	{ id: id(), name: 'Elise Bonnet', email: 'elise.bonnet@example.com', role: 'user' as const },
	{ id: id(), name: 'Dmitri Volkov', email: 'dmitri.volkov@example.com', role: 'user' as const },
	{ id: id(), name: 'Nadia Al-Amin', email: 'nadia.alamin@example.com', role: 'user' as const },
	{ id: id(), name: 'Cody Fletcher', email: 'cody.fletcher@example.com', role: 'user' as const },
	{ id: id(), name: 'Lena Brandt', email: 'lena.brandt@example.com', role: 'user' as const },
	{ id: id(), name: 'Rafael Costa', email: 'rafael.costa@example.com', role: 'user' as const },
	{ id: id(), name: 'Yuki Shimizu', email: 'yuki.shimizu@example.com', role: 'user' as const },
	{ id: id(), name: 'Fatima Ouedraogo', email: 'fatima.o@example.com', role: 'user' as const }
];

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

type EventRow = typeof schema.events.$inferInsert;

const events: EventRow[] = [
	// --- 2023 past events ---
	{
		id: id(),
		userId: '', // filled below
		name: 'FPA World Championship 2023',
		location: 'Portland, Oregon, USA',
		startDate: date('2023-08-10'),
		endDate: date('2023-08-13'),
		description:
			`<p>The annual FPA World Championship brought together the best freestyle disc players from around the globe. Four days of open pairs, mixed pairs, coop, and individual competition, culminating in an unforgettable finals night.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'European Open 2023',
		location: 'Amsterdam, Netherlands',
		startDate: date('2023-05-19'),
		endDate: date('2023-05-21'),
		description:
			`<p>Three days of freestyle competition in the heart of Amsterdam. The European Open drew competitors from over 20 countries, with fierce competition in all divisions.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Berlin Summer Jam 2023',
		location: 'Berlin, Germany',
		startDate: date('2023-07-01'),
		endDate: date('2023-07-02'),
		description:
			`<p>A classic summer jam in Tempelhof Park. Relaxed format, great vibes, open to all skill levels. Bring your disc and your friends.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Asia-Pacific Freestyle Open 2023',
		location: 'Tokyo, Japan',
		startDate: date('2023-09-22'),
		endDate: date('2023-09-24'),
		description:
			`<p>The first major freestyle disc event in Japan drew competitors from across Asia and the Pacific. An incredible atmosphere with performances that wowed both judges and spectators.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Geneva Disc Festival 2023',
		location: 'Geneva, Switzerland',
		startDate: date('2023-06-09'),
		endDate: date('2023-06-11'),
		description:
			`<p>Switzerland's premier disc festival, set against the backdrop of Lake Geneva. Freestyle competitions during the day, disc golf in the mornings, and live music in the evenings.</p>`
	},

	// --- 2024 past events ---
	{
		id: id(),
		userId: '',
		name: 'FPA World Championship 2024',
		location: 'Gothenburg, Sweden',
		startDate: date('2024-08-08'),
		endDate: date('2024-08-11'),
		description:
			`<p>Gothenburg hosted the 2024 World Championship, marking the first time Sweden has held the event. Spectacular performances throughout the week with a record number of registered competitors.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Spring Fling Portland 2024',
		location: 'Portland, Oregon, USA',
		startDate: date('2024-04-13'),
		endDate: date('2024-04-14'),
		description:
			`<p>A beloved annual tradition in Portland's waterfront parks. The Spring Fling focuses on co-op and pairs, with a relaxed judging format designed to welcome newcomers.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'London Freestyle Meetup 2024',
		location: 'London, UK',
		startDate: date('2024-03-23'),
		endDate: date('2024-03-23'),
		description:
			`<p>A one-day meetup in Hyde Park, organised by the London freestyle community. Drop in, throw some disc, and connect with players from around the UK.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Parc des Princes Open 2024',
		location: 'Paris, France',
		startDate: date('2024-06-14'),
		endDate: date('2024-06-16'),
		description:
			`<p>Held in the beautiful Parc des Princes grounds, this Paris Open brought together some of Europe's finest freestylers for a weekend of competition and workshops.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Barcelona Beach Jam 2024',
		location: 'Barcelona, Spain',
		startDate: date('2024-07-19'),
		endDate: date('2024-07-20'),
		description:
			`<p>Sand, sun, and spinning discs on the beach in Barcelona. A casual two-day beach jam with an optional pairs competition on Sunday afternoon.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'São Paulo Freestyle Open 2024',
		location: 'São Paulo, Brazil',
		startDate: date('2024-10-04'),
		endDate: date('2024-10-06'),
		description:
			`<p>South America's biggest freestyle disc event returned to São Paulo with a packed schedule of competitions, clinics, and a spectacular exhibition show.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Vienna Autumn Classic 2024',
		location: 'Vienna, Austria',
		startDate: date('2024-11-01'),
		endDate: date('2024-11-03'),
		description:
			`<p>An indoor autumn classic held in Vienna's sports complex. The Vienna Classic is known for its high technical level and tight, competitive open pairs divisions.</p>`
	},

	// --- 2025 events (some past, some upcoming from mid-2026 perspective) ---
	{
		id: id(),
		userId: '',
		name: 'FPA World Championship 2025',
		location: 'Montreal, Canada',
		startDate: date('2025-08-07'),
		endDate: date('2025-08-10'),
		description:
			`<p>Montreal welcomed the world for the 2025 FPA World Championship. A spectacular venue in Parc Jean-Drapeau and record-breaking attendance made this one for the history books.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Geneva Spring Classic 2025',
		location: 'Geneva, Switzerland',
		startDate: date('2025-05-02'),
		endDate: date('2025-05-04'),
		description:
			`<p>The Geneva Spring Classic returns with a full schedule of pairs and co-op divisions. Set along the lakefront with a view of the Alps, this is one of Europe's most scenic events.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Tokyo Winter Jam 2025',
		location: 'Tokyo, Japan',
		startDate: date('2025-02-15'),
		endDate: date('2025-02-16'),
		description:
			`<p>An indoor winter jam organised by the Tokyo Freestyle Club. Short routines, a laid-back atmosphere, and great food make this a highlight of the winter calendar.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'UK Freestyle Open 2025',
		location: 'Brighton, UK',
		startDate: date('2025-07-12'),
		endDate: date('2025-07-13'),
		description:
			`<p>Brighton's seafront is the backdrop for the annual UK Freestyle Open. Open pairs and mixed pairs divisions, with a Sunday evening exhibition on the promenade.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Autumn Disc Festival Berlin 2025',
		location: 'Berlin, Germany',
		startDate: date('2025-10-10'),
		endDate: date('2025-10-12'),
		description:
			`<p>Berlin's iconic autumn festival is back with competitions, workshops by top players, and the legendary Saturday evening jam session in Volkspark Friedrichshain.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Melbourne Summer Open 2025',
		location: 'Melbourne, Australia',
		startDate: date('2025-12-06'),
		endDate: date('2025-12-07'),
		description:
			`<p>The Southern Hemisphere summer kicks off with the Melbourne Open, held in the Royal Botanic Gardens. Australia's top freestylers battle it out in an open pairs format.</p>`
	},

	// --- 2026 upcoming events ---
	{
		id: id(),
		userId: '',
		name: 'FPA World Championship 2026',
		location: 'Geneva, Switzerland',
		startDate: date('2026-08-06'),
		endDate: date('2026-08-09'),
		description:
			`<p>The 2026 World Championship comes to Geneva — a true highlight of the freestyle calendar. Four divisions, hundreds of competitors, and the most spectacular setting in the event's history. Registration opens in March 2026.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Geneva Spring Classic 2026',
		location: 'Geneva, Switzerland',
		startDate: date('2026-05-08'),
		endDate: date('2026-05-10'),
		description:
			`<p>The traditional warm-up event for the Swiss freestyle season. The Spring Classic features full open pairs, mixed pairs, and co-op divisions, with a relaxed side event for newcomers.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Lisbon Freestyle Weekend 2026',
		location: 'Lisbon, Portugal',
		startDate: date('2026-04-17'),
		endDate: date('2026-04-19'),
		description:
			`<p>Lisbon hosts its first ever major freestyle disc event. Three days of competition, workshops, and evening socials in one of Europe's most vibrant cities.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'PDX Spring Fling 2026',
		location: 'Portland, Oregon, USA',
		startDate: date('2026-04-11'),
		endDate: date('2026-04-12'),
		description:
			`<p>Portland's beloved spring jam returns to the waterfront. All skill levels welcome; co-op and pairs format with beginner-friendly judging clinics on Saturday morning.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Berlin Summer Jam 2026',
		location: 'Berlin, Germany',
		startDate: date('2026-07-04'),
		endDate: date('2026-07-05'),
		description:
			`<p>Tempelhof Park once again hosts the Berlin Summer Jam — a staple of the European freestyle summer. Free to enter, open to all, and guaranteed good vibes.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Nordic Open 2026',
		location: 'Helsinki, Finland',
		startDate: date('2026-06-20'),
		endDate: date('2026-06-21'),
		description:
			`<p>The Nordic Open makes its debut in Helsinki on the longest days of the year. Open pairs competition with a midnight sun jam session on Saturday evening.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Seoul Disc Classic 2026',
		location: 'Seoul, South Korea',
		startDate: date('2026-09-19'),
		endDate: date('2026-09-20'),
		description:
			`<p>The Seoul Disc Classic returns for its third edition. Two days of competitive freestyle in the heart of the city, with a growing community of Korean freestylers at the forefront.</p>`
	},
	{
		id: id(),
		userId: '',
		name: 'Cape Town Open 2026',
		location: 'Cape Town, South Africa',
		startDate: date('2026-11-14'),
		endDate: date('2026-11-15'),
		description:
			`<p>Africa's premier freestyle disc event, held at a beachfront venue with Table Mountain as the backdrop. An unforgettable setting for a world-class competition.</p>`
	}
];

// ---------------------------------------------------------------------------
// Schedules (a few events get real schedules)
// ---------------------------------------------------------------------------

type ScheduleRow = typeof schema.schedules.$inferInsert;

function makeSchedule(eventId: string, items: Omit<ScheduleRow, 'id' | 'eventId'>[]): ScheduleRow[] {
	return items.map((item) => ({ id: id(), eventId, ...item }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const DATABASE_URL = process.env.DATABASE_URL;
	if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

	const client = postgres(DATABASE_URL);
	const db = drizzle(client, { schema });

	console.log('🧹 Clearing existing data...');

	// Delete in FK-safe order
	await db.delete(schema.schedules);
	await db.delete(schema.eventMagicLinks);
	await db.delete(schema.eventUser);
	await db.delete(schema.events);
	// Delete non-admin users only (preserves any real accounts)
	await db.delete(schema.user).where(sql`email NOT LIKE '%@real-domain-that-does-not-exist.invalid%'`);

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
				createdAt: new Date(),
				updatedAt: new Date()
			}))
		)
		.onConflictDoUpdate({
			target: schema.user.email,
			set: { name: sql`excluded.name`, role: sql`excluded.role` }
		})
		.returning();

	const userIds = insertedUsers.map((u) => u.id);
	const adminId = insertedUsers.find((u) => u.email === ADMIN_EMAIL)!.id;

	console.log('📅 Seeding events...');

	// Assign organizers: admin creates the big championships, others create the rest
	const eventsWithOwners = events.map((evt, i) => ({
		...evt,
		userId: i % 5 === 0 ? adminId : userIds[i % userIds.length],
		createdAt: new Date(),
		updatedAt: new Date()
	}));

	const insertedEvents = await db.insert(schema.events).values(eventsWithOwners).returning();

	console.log('🗓️  Seeding schedules...');

	// Give the World Championships and a couple others a proper schedule
	const worldChamp2026 = insertedEvents.find((e) => e.name === 'FPA World Championship 2026')!;
	const worldChamp2025 = insertedEvents.find((e) => e.name === 'FPA World Championship 2025')!;
	const genevaSC2026 = insertedEvents.find((e) => e.name === 'Geneva Spring Classic 2026')!;

	const schedules: ScheduleRow[] = [
		...(worldChamp2026
			? makeSchedule(worldChamp2026.id, [
					{
						name: 'Registration & Practice',
						startDate: date('2026-08-06T09:00:00'),
						endDate: date('2026-08-06T18:00:00'),
						location: 'Main Field, Parc de la Grange',
						description: `<p>Check in, collect your badge, and get some practice throws in before competition begins.</p>`
					},
					{
						name: 'Open Pairs — Prelims',
						startDate: date('2026-08-07T09:00:00'),
						endDate: date('2026-08-07T18:00:00'),
						location: 'Competition Field A',
						description: `<p>Preliminary rounds for Open Pairs. All registered teams compete.</p>`
					},
					{
						name: 'Mixed Pairs & Co-op — Prelims',
						startDate: date('2026-08-08T09:00:00'),
						endDate: date('2026-08-08T18:00:00'),
						location: 'Competition Field A & B',
						description: `<p>Preliminary rounds for Mixed Pairs and Co-op divisions.</p>`
					},
					{
						name: 'Finals Night',
						startDate: date('2026-08-09T17:00:00'),
						endDate: date('2026-08-09T22:00:00'),
						location: 'Main Stage, Parc de la Grange',
						description: `<p>The top teams from each division compete for the World Championship titles. Open to the public.</p>`
					}
				])
			: []),

		...(worldChamp2025
			? makeSchedule(worldChamp2025.id, [
					{
						name: 'Registration Day',
						startDate: date('2025-08-07T09:00:00'),
						endDate: date('2025-08-07T17:00:00'),
						location: 'Parc Jean-Drapeau, Montreal',
						description: `<p>Registration, practice fields open, welcome reception in the evening.</p>`
					},
					{
						name: 'Prelims — Day 1',
						startDate: date('2025-08-08T09:00:00'),
						endDate: date('2025-08-08T18:00:00'),
						location: 'Competition Fields',
						description: `<p>Open Pairs and Mixed Pairs preliminary rounds.</p>`
					},
					{
						name: 'Prelims — Day 2',
						startDate: date('2025-08-09T09:00:00'),
						endDate: date('2025-08-09T18:00:00'),
						location: 'Competition Fields',
						description: `<p>Co-op and Individual preliminary rounds. Semi-finals for Pairs.</p>`
					},
					{
						name: 'Finals',
						startDate: date('2025-08-10T16:00:00'),
						endDate: date('2025-08-10T21:00:00'),
						location: 'Main Stage',
						description: `<p>Finals for all divisions. Award ceremony follows.</p>`
					}
				])
			: []),

		...(genevaSC2026
			? makeSchedule(genevaSC2026.id, [
					{
						name: 'Day 1 — Pairs Prelims',
						startDate: date('2026-05-08T10:00:00'),
						endDate: date('2026-05-08T18:00:00'),
						location: 'Parc des Bastions, Geneva',
						description: `<p>Open Pairs and Mixed Pairs preliminary rounds.</p>`
					},
					{
						name: 'Day 2 — Co-op & Semis',
						startDate: date('2026-05-09T10:00:00'),
						endDate: date('2026-05-09T18:00:00'),
						location: 'Parc des Bastions, Geneva',
						description: `<p>Co-op prelims and semi-finals for all divisions.</p>`
					},
					{
						name: 'Day 3 — Finals',
						startDate: date('2026-05-10T14:00:00'),
						endDate: date('2026-05-10T19:00:00'),
						location: 'Parc des Bastions, Geneva',
						description: `<p>Finals for all divisions, followed by an open jam session.</p>`
					}
				])
			: [])
	];

	if (schedules.length) {
		await db.insert(schema.schedules).values(schedules);
	}

	console.log('🎟️  Seeding RSVPs...');

	// Spread RSVPs realistically across events
	const rsvps: (typeof schema.eventUser.$inferInsert)[] = [];
	for (const evt of insertedEvents) {
		// Pick a random subset of users to attend each event (3–10 people)
		const attendeeCount = 3 + Math.floor(Math.random() * 8);
		const shuffled = [...userIds].sort(() => Math.random() - 0.5);
		const attendees = shuffled.slice(0, attendeeCount);

		for (const userId of attendees) {
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

	console.log(`✅ Done! Seeded ${insertedUsers.length} users, ${insertedEvents.length} events, ${schedules.length} schedule items, ${rsvps.length} RSVPs.`);
	await client.end();
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
