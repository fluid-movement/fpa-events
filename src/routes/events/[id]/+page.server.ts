import { db } from '$lib/server/db';
import { events } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, type ServerLoadEvent } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }: ServerLoadEvent) => {
  if (!params.id) error(404, 'Not found');
  
	const event = await db.select().from(events).where(eq(events.id, params.id));
	
	if (!event || event.length === 0) error(404, 'Not found');
	
	return {
		event: event[0],
		userId: locals.user?.id ?? null
	};
};
