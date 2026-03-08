import { redirect, type ServerLoadEvent } from '@sveltejs/kit';
import { resolve } from '$app/paths';

export const load = async ({ locals }: ServerLoadEvent) => {
	if (!locals.user) {
		redirect(307, resolve('/sign-in'));
	}
};
