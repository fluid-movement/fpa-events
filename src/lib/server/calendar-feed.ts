import ical, { ICalCalendarMethod } from 'ical-generator';
import { eventPath } from '#lib/utils/urls';

/**
 * ical-generator escapes line breaks in SUMMARY and LOCATION but writes the
 * calendar `name` verbatim, so a CR/LF in a user's name would inject iCalendar
 * lines. Replace every C0 control and DEL with a space first.
 */
export function calendarName(ownerName: string): string {
	// eslint-disable-next-line no-control-regex
	return `FPA Events — ${ownerName.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim()}`;
}

export interface FeedEvent {
	id: string;
	name: string;
	location: string;
	startDate: Date;
	endDate: Date;
}

export function buildCalendarFeed(ownerName: string, events: FeedEvent[], origin: string): string {
	const cal = ical({ name: calendarName(ownerName), method: ICalCalendarMethod.PUBLISH });

	for (const event of events) {
		cal.createEvent({
			id: `${event.id}@fpa-events`,
			start: event.startDate,
			end: event.endDate,
			summary: event.name,
			location: event.location,
			description: `${origin}${eventPath(event.id)}`
		});
	}

	return cal.toString();
}
