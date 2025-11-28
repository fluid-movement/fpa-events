import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.TURSO_DATABASE_URL) {
	throw new Error('TURSO_DATABASE_URL environment variable is not set');
}

if (!env.TURSO_AUTH_TOKEN) {
	throw new Error('TURSO_AUTH_TOKEN environment variable is not set');
}

const client = createClient({
	url: env.TURSO_DATABASE_URL,
	authToken: env.TURSO_AUTH_TOKEN
});

export const db = drizzle(client, { schema });
