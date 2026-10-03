import * as v from 'valibot';
import { form, getRequestEvent } from '$app/server';
import { requireSignedInRequest } from '#lib/server/authz';

/**
 * Name changes go through Better Auth's own endpoint rather than a direct
 * `db.update`, so its session handling and hooks stay in step.
 */
export const updateProfile = form(
	v.object({ name: v.pipe(v.string(), v.trim(), v.minLength(1, 'Name is required.')) }),
	async (data) => {
		requireSignedInRequest();

		// The event's own `fetch`, so the session cookie rides along.
		const { fetch } = getRequestEvent();
		const res = await fetch('/api/auth/update-user', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: data.name })
		});

		if (!res.ok) {
			const body = (await res.json().catch(() => ({}))) as { message?: string };
			return { error: body.message ?? 'Failed to update profile.' };
		}

		return { success: true };
	}
);
