// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { DrizzleClient } from '$lib/server/db';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: DrizzleClient;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Env;
		}
	}
}

export {};
