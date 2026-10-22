import { auth } from '#lib/server/auth';
import { db } from '#lib/server/db';
import { user } from '#lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/env';
import { type Handle, type HandleServerError } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import { GLITCHTIP_DSN } from '$app/env/private';
import { trackerOptions } from '#lib/error-tracking';
import { rejectNulPath } from '#lib/server/validation';
import {
	describeServerError,
	isMalformedClientInput,
	isMisroutedRemotePayload,
	keepRemoteFormBody,
	reportableError
} from '#lib/server/errors';
import { withFailedSignInTiming } from '#lib/server/sign-in-timing';
import { startUploadCleanup } from '#lib/server/upload-cleanup';

// A blank DSN leaves the SDK disabled (dev, tests).
Sentry.init(trackerOptions(GLITCHTIP_DSN));

export const handle: Handle = async ({ event, resolve }) => {
	if (!building) startUploadCleanup();
	// Before the session lookup, so a NUL never reaches a query.
	rejectNulPath(event.url);
	if (isMisroutedRemotePayload(event.request)) {
		return withSecurityHeaders(
			new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET' } })
		);
	}
	// Before Kit reads it, so a decoding failure can be told from a callback's.
	keepRemoteFormBody(event.request);
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		// Looked up separately because `role` is not one of Better Auth's
		// `additionalFields`, so it never reaches `session.user`.
		const [record] = await db
			.select({ role: user.role })
			.from(user)
			.where(eq(user.id, session.user.id));
		event.locals.role = record?.role ?? 'user';
	}

	const response = await withFailedSignInTiming(event.request, () =>
		svelteKitHandler({ event, resolve, auth, building })
	);
	return withSecurityHeaders(response);
};

/**
 * Headers every response carries. The CSP itself is Kit's (`csp` in
 * `svelte-options.js`), because only Kit knows the nonce of its inline script.
 */
const SECURITY_HEADERS: Record<string, string> = {
	'x-content-type-options': 'nosniff',
	// Invite and calendar-feed URLs carry tokens in the path: never let the full
	// URL leave the site in a Referer.
	'referrer-policy': 'strict-origin-when-cross-origin',
	// `frame-ancestors 'none'` covers current browsers; this covers the rest.
	'x-frame-options': 'DENY',
	// No `includeSubDomains`: other freestyledisc.org hosts are not ours.
	'strict-transport-security': 'max-age=31536000',
	'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

/**
 * Kit sets its CSP on pages only. Everything else (the calendar feed, remote
 * function JSON, the upload API) renders nothing, so it gets the strictest
 * policy: nothing may load and nothing may frame it.
 */
const NON_PAGE_CSP = "default-src 'none'; frame-ancestors 'none'";

function withSecurityHeaders(response: Response): Response {
	const headers: Record<string, string> = {
		...SECURITY_HEADERS,
		'content-security-policy': NON_PAGE_CSP
	};
	for (const [name, value] of Object.entries(headers)) {
		// Some responses (redirects from `fetch`, static files) are immutable.
		try {
			if (!response.headers.has(name)) response.headers.set(name, value);
		} catch {
			const copy = new Response(response.body, response);
			return withSecurityHeaders(copy);
		}
	}
	return response;
}

/**
 * Unexpected errors only: each gets a short reference that is logged with the
 * method, route and user, and shown on the error page so a user can quote it.
 * Errors thrown with `error()` keep Kit's defaults and are not logged.
 */
export const handleError: HandleServerError = async ({ kind, error, event }) => {
	// Kit failing to decode a malformed request body or argument: the client's
	// fault, so a 400 with no reference, log line or report.
	if (kind === 'unknown' && (await isMalformedClientInput(error, event.request))) {
		return { status: 400, message: 'Bad Request' };
	}
	const report = describeServerError({
		kind,
		error,
		method: event.request.method,
		routeId: event.route.id,
		userId: event.locals.user?.id ?? null
	});
	if (!report) return;

	console.error(report.logLine);
	if (report.stack) console.error(report.stack);

	// The route id, never `event.url`, and the user by id only.
	Sentry.withScope((scope) => {
		scope.setTag('errorId', report.errorId);
		if (event.route.id) scope.setTransactionName(event.route.id);
		const userId = event.locals.user?.id;
		if (userId) scope.setUser({ id: userId });
		// A sanitised copy: the SDK parses the raw stack header into frames.
		Sentry.captureException(reportableError(error));
	});
	return { message: 'Internal Error', errorId: report.errorId };
};
