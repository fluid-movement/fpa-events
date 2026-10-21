import { describe, it, expect, vi, afterEach } from 'vitest';
import { setEnv } from '../../test/mocks/app-env-private';
import { verifyTurnstile } from './turnstile';

// The mocked env has no TURNSTILE_SECRET_KEY by default (see mocks/env-dynamic-private.ts).

afterEach(() => {
	setEnv({ TURNSTILE_SECRET_KEY: undefined });
	vi.restoreAllMocks();
});

describe('verifyTurnstile', () => {
	it('bypasses verification (returns true) when no secret key is configured', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await expect(verifyTurnstile(undefined)).resolves.toBe(true);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('returns false for a missing token when a secret is configured', async () => {
		setEnv({ TURNSTILE_SECRET_KEY: 'secret' });
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await expect(verifyTurnstile(undefined)).resolves.toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('returns the success value from Cloudflare siteverify', async () => {
		setEnv({ TURNSTILE_SECRET_KEY: 'secret' });
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
		setEnv({ TURNSTILE_SECRET_KEY: 'secret' });
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
		await expect(verifyTurnstile('token')).resolves.toBe(false);
	});
});

import { isHttpError } from '@sveltejs/kit';
import { requireTurnstile } from './turnstile';
describe('requireTurnstile', () => {
	it('rejects an expired challenge with 400 rather than a server fault', async () => {
		setEnv({ TURNSTILE_SECRET_KEY: 'secret' });
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ success: false }))
		);
		try {
			await requireTurnstile('expired-token');
			expect.fail('Expected captcha rejection');
		} catch (error) {
			expect(isHttpError(error, 400)).toBe(true);
		}
	});
});
