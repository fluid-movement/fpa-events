import { requireSignedIn } from '$lib/server/authz';
import type { PageServerLoad } from './$types';

export const load = (({ locals }) => {
	const signedIn = requireSignedIn(locals);
	return { name: signedIn.name, email: signedIn.email };
}) satisfies PageServerLoad;
