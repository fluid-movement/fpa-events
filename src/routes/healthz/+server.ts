import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db';
import type { RequestHandler } from './$types';

/**
 * Liveness for Coolify's container health check and the external uptime
 * monitor: 200 when Postgres answers, 503 when it does not. Deliberately says
 * nothing else, and ignores fpa-api, Mailgun and R2, which all have their own
 * fallbacks and must not mark a working app unhealthy.
 */

/** Well under a health check's own timeout, so a hung pool still gets an answer. */
const DB_TIMEOUT_MS = 3000;

export const GET: RequestHandler = async () => {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<false>((resolve) => {
		timer = setTimeout(() => resolve(false), DB_TIMEOUT_MS);
	});
	const queried = db.execute(sql`select 1`).then(
		() => true,
		() => false
	);

	const healthy = await Promise.race([queried, timedOut]);
	clearTimeout(timer);

	return new Response(healthy ? 'ok' : 'unavailable', {
		status: healthy ? 200 : 503,
		headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' }
	});
};
