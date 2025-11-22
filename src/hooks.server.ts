import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize database connection
	// In production (Cloudflare): use D1 from platform.env.DB
	// In local development: use DATABASE_URL from .env
	event.locals.db = getDb(event.platform?.env?.DB, env.DATABASE_URL);

	return resolve(event);
};
