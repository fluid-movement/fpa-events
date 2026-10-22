import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { DATABASE_URL } from '$app/env/private';
import { building } from '$app/env';

// The build imports server modules but never queries. postgres-js connects
// lazily on first query, so a placeholder URL is harmless at build time.
// At runtime, assertProductionConfig() refuses to start without DATABASE_URL.
if (!DATABASE_URL && !building) {
	throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(DATABASE_URL ?? 'postgres://build-placeholder/unused');
export const db = drizzle(client, { schema });
