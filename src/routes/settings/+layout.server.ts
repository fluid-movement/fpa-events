import { requireSignedIn } from '#lib/server/authz';
import type { LayoutServerLoad } from './$types';

/** Every settings tab is for the signed-in user only — guarded once, here. */
export const load = (({ locals }) => {
	requireSignedIn(locals);
}) satisfies LayoutServerLoad;
