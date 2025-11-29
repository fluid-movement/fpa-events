// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { db } from '$lib/server/db';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: typeof db;
			session?: Session;
			user?: User;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
