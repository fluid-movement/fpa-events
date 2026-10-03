import { requireSignedIn } from '#lib/server/authz';
import { organizingEvents } from '#lib/server/utils/events';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	return organizingEvents(requireSignedIn(locals).id);
}) satisfies PageServerLoad;
