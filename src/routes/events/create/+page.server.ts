import { requireSignedIn } from '$lib/server/authz';
import type { PageServerLoad } from './$types';

export const load = (({ locals }) => {
	requireSignedIn(locals);
}) satisfies PageServerLoad;
