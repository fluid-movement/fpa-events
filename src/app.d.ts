// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { auth } from '#lib/server/auth';

declare global {
	namespace App {
		interface Error {
			/** Set by the server `handleError` hook for unexpected errors. */
			errorId?: string;
		}
		interface Locals {
			session: typeof auth.$Infer.Session.session | undefined;
			user: typeof auth.$Infer.Session.user | undefined;
			role: 'user' | 'admin' | undefined;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
