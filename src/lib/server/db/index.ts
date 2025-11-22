import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

export function createDb(d1: D1Database): DrizzleD1Database<typeof schema> {
	return drizzle(d1, { schema });
}

// For use in SvelteKit hooks/endpoints
export type DB = DrizzleD1Database<typeof schema>;
