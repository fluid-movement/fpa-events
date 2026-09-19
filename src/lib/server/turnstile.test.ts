import { describe, it, expect, vi, afterEach } from 'vitest';
import { env } from '$env/dynamic/private';
import { verifyTurnstile } from './turnstile';

// The mocked env has no TURNSTILE_SECRET_KEY by default (see mocks/env-dynamic-private.ts).

afterEach(() => {
	// Not `delete`: TypeScript 6 rejects deleting a non-optional property, and
	// SvelteKit types `$env/dynamic/private` from the variables actually present
	// at sync time, so this one is required whenever a `.env` defines it.
	// `verifyTurnstile` branches on `!secret`, so '' and unset are the same thing.
	env.TURNSTILE_SECRET_KEY = '';
	vi.restoreAllMocks();
});

describe('verifyTurnstile', () => {
	it('bypasses verification (returns true) when no secret key is configured', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await expect(verifyTurnstile(undefined)).resolves.toBe(true);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('returns false for a missing token when a secret is configured', async () => {
		env.TURNSTILE_SECRET_KEY = 'secret';
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await expect(verifyTurnstile(undefined)).resolves.toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('returns the success value from Cloudflare siteverify', async () => {
		env.TURNSTILE_SECRET_KEY = 'secret';
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ success: true }))
		);
		await expect(verifyTurnstile('good-token')).resolves.toBe(true);

		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ success: false }))
		);
		await expect(verifyTurnstile('bad-token')).resolves.toBe(false);
	});

	it('returns false when the siteverify request throws', async () => {
		env.TURNSTILE_SECRET_KEY = 'secret';
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
		await expect(verifyTurnstile('token')).resolves.toBe(false);
	});
});
