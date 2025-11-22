// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { DB } from '$lib/server/db';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: DB;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				DB: D1Database;
			};
			context: {
				waitUntil(promise: Promise<unknown>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
