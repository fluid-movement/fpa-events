import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp' }),
	password: text('password').notNull(),
	role: text('role').notNull().default('user'),
	rememberToken: text('remember_token'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Events table
export const events = sqliteTable(
	'events',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
		name: text('name').notNull(),
		startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
		endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
		location: text('location').notNull(),
		description: text('description').notNull(),
		picture: text('picture'),
		pictureWidth: integer('picture_width'),
		pictureHeight: integer('picture_height'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`)
	},
	(table) => ({
		userIdIdx: index('events_user_id_index').on(table.userId)
	})
);

// Event User pivot table
export const eventUser = sqliteTable(
	'event_user',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		status: text('status').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`)
	},
	(table) => ({
		userStatusIdx: index('user_status_index').on(table.userId, table.status, table.eventId),
		eventUserIdx: index('event_user_index').on(table.eventId, table.userId, table.updatedAt),
		eventStatusIdx: index('event_status_index').on(table.eventId, table.status, table.updatedAt)
	})
);

// Event Magic Links table
export const eventMagicLinks = sqliteTable(
	'event_magic_links',
	{
		id: text('id').primaryKey(),
		eventId: text('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`)
	},
	(table) => ({
		eventIdIdx: index('event_magic_links_event_id_index').on(table.eventId)
	})
);

// Schedules table
export const schedules = sqliteTable('schedules', {
	id: text('id').primaryKey(),
	eventId: text('event_id')
		.notNull()
		.references(() => events.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
	endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
	description: text('description'),
	location: text('location'),
	longitude: real('longitude'),
	latitude: real('latitude'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	events: many(events),
	eventUsers: many(eventUser)
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
	user: one(users, {
		fields: [events.userId],
		references: [users.id]
	}),
	eventUsers: many(eventUser),
	eventMagicLinks: many(eventMagicLinks),
	schedules: many(schedules)
}));

export const eventUserRelations = relations(eventUser, ({ one }) => ({
	event: one(events, {
		fields: [eventUser.eventId],
		references: [events.id]
	}),
	user: one(users, {
		fields: [eventUser.userId],
		references: [users.id]
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
	})
}));
