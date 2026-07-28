import { relations, sql } from 'drizzle-orm';
import {
	pgTable,
	text,
	integer,
	index,
	real,
	boolean,
	timestamp,
	type AnyPgColumn
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	role: text('role', { enum: ['user', 'admin'] })
		.default('user')
		.notNull(),
	calendarToken: text('calendar_token').unique(),
	// Whether this user's name may be shown publicly in event attendee lists.
	// Opting out still counts them towards the attendee total.
	showAttendance: boolean('show_attendance').default(true).notNull(),
	createdAt: timestamp('created_at', { mode: 'date' })
		.default(sql`now()`)
		.notNull(),
	updatedAt: timestamp('updated_at', { mode: 'date' })
		.default(sql`now()`)
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const events = pgTable(
	'events',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id),
		name: text('name').notNull(),
		startDate: timestamp('start_date', { mode: 'date' }).notNull(),
		endDate: timestamp('end_date', { mode: 'date' }).notNull(),
		location: text('location').notNull(),
		eventLocationId: integer('event_location_id').references((): AnyPgColumn => eventLocations.id, {
			onDelete: 'set null'
		}),
		description: text('description').notNull(),
		picture: text('picture'),
		pictureWidth: integer('picture_width'),
		pictureHeight: integer('picture_height'),
		createdAt: timestamp('created_at', { mode: 'date' })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' })
			.default(sql`now()`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('events_user_id_index').on(table.userId)]
);

// Event User pivot table
export const eventUser = pgTable(
	'event_user',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		status: text('status').notNull(),
		createdAt: timestamp('created_at', { mode: 'date' })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp('updated_at', { mode: 'date' })
			.notNull()
			.default(sql`now()`)
	},
	(table) => [
		index('user_status_index').on(table.userId, table.status, table.eventId),
		index('event_user_index').on(table.eventId, table.userId, table.updatedAt),
		index('event_status_index').on(table.eventId, table.status, table.updatedAt)
	]
);

// Event Magic Links table
export const eventMagicLinks = pgTable(
	'event_magic_links',
	{
		id: text('id').primaryKey(),
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
		createdAt: timestamp('created_at', { mode: 'date' })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp('updated_at', { mode: 'date' })
			.notNull()
			.default(sql`now()`)
	},
	(table) => [index('event_magic_links_event_id_index').on(table.eventId)]
);

// Global city-level locations — deduplicated, shared across all events
export const eventLocations = pgTable(
	'event_locations',
	{
		id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
		city: text('city').notNull(),
		country: text('country').notNull(),
		latitude: real('latitude').notNull(),
		longitude: real('longitude').notNull()
	},
	(table) => [index('event_locations_city_country_idx').on(table.city, table.country)]
);

// Per-event venue locations — scoped to one event, reusable across its schedule items
export const scheduleLocations = pgTable('schedule_locations', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	eventId: text('event_id')
		.notNull()
		.references(() => events.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	address: text('address'),
	// Nullable: a venue can be a plain name with no position on the map.
	latitude: real('latitude'),
	longitude: real('longitude'),
	createdAt: timestamp('created_at', { mode: 'date' })
		.notNull()
		.default(sql`now()`)
});

// Schedules table
export const schedules = pgTable('schedules', {
	id: text('id').primaryKey(),
	eventId: text('event_id')
		.notNull()
		.references(() => events.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	startDate: timestamp('start_date', { mode: 'date' }).notNull(),
	endDate: timestamp('end_date', { mode: 'date' }).notNull(),
	description: text('description'),
	locationId: integer('location_id').references(() => scheduleLocations.id, {
		onDelete: 'set null'
	}),
	createdAt: timestamp('created_at', { mode: 'date' })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp('updated_at', { mode: 'date' })
		.notNull()
		.default(sql`now()`)
});

// Relations
export const usersRelations = relations(user, ({ many }) => ({
	events: many(events),
	eventUsers: many(eventUser)
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
	user: one(user, {
		fields: [events.userId],
		references: [user.id]
	}),
	eventLocation: one(eventLocations, {
		fields: [events.eventLocationId],
		references: [eventLocations.id]
	}),
	eventUsers: many(eventUser),
	eventMagicLinks: many(eventMagicLinks),
	schedules: many(schedules),
	scheduleLocations: many(scheduleLocations)
}));

export const eventLocationsRelations = relations(eventLocations, ({ many }) => ({
	events: many(events)
}));

export const scheduleLocationsRelations = relations(scheduleLocations, ({ one, many }) => ({
	event: one(events, {
		fields: [scheduleLocations.eventId],
		references: [events.id]
	}),
	schedules: many(schedules)
}));

export const eventUserRelations = relations(eventUser, ({ one }) => ({
	event: one(events, {
		fields: [eventUser.eventId],
		references: [events.id]
	}),
	user: one(user, {
		fields: [eventUser.userId],
		references: [user.id]
	})
}));

export const eventMagicLinksRelations = relations(eventMagicLinks, ({ one }) => ({
	event: one(events, {
		fields: [eventMagicLinks.eventId],
		references: [events.id]
	})
}));

export const schedulesRelations = relations(schedules, ({ one }) => ({
	event: one(events, {
		fields: [schedules.eventId],
		references: [events.id]
	}),
	location: one(scheduleLocations, {
		fields: [schedules.locationId],
		references: [scheduleLocations.id]
	})
}));

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at', { mode: 'date' })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'date' }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'date' }),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { mode: 'date' })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' })
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
		createdAt: timestamp('created_at', { mode: 'date' })
			.default(sql`now()`)
			.notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' })
			.default(sql`now()`)
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));
