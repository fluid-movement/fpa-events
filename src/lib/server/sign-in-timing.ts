import { setTimeout as sleep } from 'node:timers/promises';

// Covers the measured scrypt and bcrypt costs through 13. This is a latency
// floor, not constant-time authentication: slower hashes/load can exceed it.
// Never derive this budget from a password, email, or stored bcrypt work factor.
export const FAILED_SIGN_IN_FLOOR_MS = 1000;

/** Bound added work to one asynchronous wait; preserve auth's response verbatim. */
export async function withFailedSignInTiming(
	request: Request,
	handle: () => Promise<Response>
): Promise<Response> {
	if (
		request.method !== 'POST' ||
		!/^\/api\/auth\/sign-in\/email\/?$/.test(new URL(request.url).pathname)
	) {
		return handle();
	}

	const started = performance.now();
	const response = await handle();
	// Unknown accounts, missing credentials and wrong passwords all return 401.
	// Leave successes, validation/CAPTCHA failures and throttling (429) alone.
	if (response.status === 401) {
		const remaining = Math.min(
			FAILED_SIGN_IN_FLOOR_MS,
			Math.max(0, FAILED_SIGN_IN_FLOOR_MS - (performance.now() - started))
		);
		if (remaining > 0) await sleep(remaining);
	}
	return response;
}
