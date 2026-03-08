import { redirect, fail, type ServerLoadEvent } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }: ServerLoadEvent) => {
	if (!locals.user) {
		redirect(307, resolve('/sign-in'));
	}

	return {
		name: locals.user.name,
		email: locals.user.email
	};
};

export const actions: Actions = {
	default: async ({ request, locals, fetch }) => {
		if (!locals.user) {
			redirect(307, resolve('/sign-in'));
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();

		if (!name) {
			return fail(400, { error: 'Name is required.' });
		}

		const res = await fetch('/api/auth/update-user', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			return fail(res.status, { error: (body as { message?: string }).message ?? 'Failed to update profile.' });
		}

		return { success: true };
	}
};
