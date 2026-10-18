/**
 * Shared by the server and browser error-tracker setup (GlitchTip, reached
 * with the Sentry SDK).
 *
 * Nothing that identifies a request may leave the site: `/invite/[token]` and
 * `/api/calendar/[token]/feed.ics` carry their credential in the path. So the
 * event keeps the route id and the user id and drops the rest.
 */
import type { Breadcrumb, ErrorEvent } from '@sentry/core';

/** Breadcrumbs record URLs (navigation, fetch, console), so none are kept. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
	void breadcrumb;
	return null;
}

/**
 * Strips an event down to what is safe to send: no request (URL, query string,
 * cookies, headers, body), no breadcrumbs, and a user reduced to its id.
 */
export function scrubEvent<T extends ErrorEvent>(event: T): T {
	delete event.request;
	delete event.breadcrumbs;
	if (event.user?.id !== undefined) event.user = { id: event.user.id };
	else delete event.user;
	// A transaction name must be a route id, never a URL.
	if (event.transaction && !event.transaction.startsWith('/')) delete event.transaction;
	if (event.transaction?.includes('://')) delete event.transaction;
	// The browser SDK also puts the page URL in a few other places.
	if (event.tags) delete event.tags.url;
	if (event.contexts) delete event.contexts.trace?.data;
	return event;
}

/** Init options common to both sides; a blank DSN leaves the SDK disabled. */
export function trackerOptions(dsn: string | undefined) {
	return {
		dsn: dsn || undefined,
		enabled: Boolean(dsn),
		sendDefaultPii: false,
		beforeSend: scrubEvent,
		beforeBreadcrumb: scrubBreadcrumb
	};
}
