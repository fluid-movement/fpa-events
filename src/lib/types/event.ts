import type { events } from '$lib/server/db/schema';

export type Event = typeof events.$inferSelect;

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
}
