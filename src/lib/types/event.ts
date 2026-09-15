import type { events } from '$lib/server/db/schema';

/**
 * Shared shapes for the event UI.
 *
 * The import above is type-only, so nothing from `$lib/server` reaches the
 * browser bundle — it just keeps these in step with the table definitions.
 */
export type Event = typeof events.$inferSelect;

/** The relationship a user has to an event, as stored in `event_user.status`. */
export type EventUserStatus = 'attending' | 'organizing';

/** An event row carrying its attendee total, as the browse pages render it. */
export type EventWithAttendeeCount = Event & { attendeeCount: number };

/** The same, plus how the signed-in user relates to it. */
export type EventListItem = EventWithAttendeeCount & { userStatus: EventUserStatus | null };

export interface EventLocation {
	id: number;
	name: string;
	address?: string | null;
}

export interface ScheduleItem {
	id: string;
	name: string;
	description?: string | null;
	startDate: Date;
	endDate: Date;
	locationId?: number | null;
	locationName?: string | null;
}

export interface Attendee {
	id: number;
	name: string;
	email: string;
	status?: string;
	userId?: string;
}
