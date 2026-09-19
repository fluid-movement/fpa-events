import { TURNSTILE_SECRET_KEY } from '$app/env/private';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Cloudflare Turnstile token server-side.
 *
 * Returns `true` when `TURNSTILE_SECRET_KEY` is unset (captcha disabled — dev/test),
 * otherwise validates the token against Cloudflare's siteverify endpoint. Returns
 * `false` on a missing token, a failed challenge, or a network error.
 *
 * The Better Auth captcha plugin already guards the auth endpoints; use this for
 * non-auth surfaces (e.g. the create-event remote function) that the plugin doesn't cover.
 */
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
	const secret = TURNSTILE_SECRET_KEY;
	if (!secret) return true;
	if (!token) return false;

	try {
		const res = await fetch(SITEVERIFY_URL, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ secret, response: token })
		});
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch (err) {
		console.error('[turnstile] verification request failed:', err);
		return false;
	}
}

/** `verifyTurnstile`, but for call sites that just want to abort on failure. */
export async function requireTurnstile(token: string | undefined): Promise<void> {
	if (!(await verifyTurnstile(token))) {
		throw new Error('Captcha verification failed');
	}
}
