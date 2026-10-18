import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit/hooks';
import { PUBLIC_GLITCHTIP_DSN } from '$app/env/public';
import { trackerOptions } from '#lib/error-tracking';
import { newErrorId } from '#lib/utils/error-id';

// A blank DSN leaves the SDK disabled (dev, tests).
Sentry.init(trackerOptions(PUBLIC_GLITCHTIP_DSN));

/**
 * Only `kind === 'unknown'` errors are unexpected (as on the server), so only
 * those are reported with a reference the error page shows.
 */
export const handleError: HandleClientError = ({ kind, error, event }) => {
	if (kind !== 'unknown') return;

	const errorId = newErrorId();
	Sentry.withScope((scope) => {
		scope.setTag('errorId', errorId);
		if (event.route.id) scope.setTransactionName(event.route.id);
		Sentry.captureException(error);
	});
	console.error(`[client error] ref=${errorId}`, error);
	return { message: 'Internal Error', errorId };
};
