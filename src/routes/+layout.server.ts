import type { LayoutServerLoad } from './$types';

/**
 * Auth state for the app chrome. The sidebar footer reads the session from the
 * better-auth client, but the mobile tab bar has to be right on the very first
 * paint — a client-only check would render "Sign in" during SSR and swap to
 * "You" on hydration.
 */
export const load = (({ locals }) => {
	return { signedIn: !!locals.user };
}) satisfies LayoutServerLoad;
