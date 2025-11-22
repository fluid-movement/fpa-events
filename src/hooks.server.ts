import { createDb } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize database connection from platform binding
	// The platform.env is emulated during dev based on wrangler.toml
	if (event.platform?.env?.DB) {
		event.locals.db = createDb(event.platform.env.DB);
	} else {
		throw new Error(
			'D1 database binding not found. ' +
				'Make sure DB is configured in wrangler.toml and you are running with: bun run dev'
		);
	}

	return resolve(event);
};
