import { describe, it, expect, vi, afterEach } from 'vitest';
import { env } from '$env/dynamic/private';
import { fpaApiGet, FpaApiError } from './client';

// The mocked env sets FPA_API_URL to https://fpa-api.test (see mocks/env-dynamic-private.ts).
const ORIGINAL_URL = env.FPA_API_URL;

afterEach(() => {
	env.FPA_API_URL = ORIGINAL_URL;
	vi.restoreAllMocks();
});

describe('fpaApiGet', () => {
	it('requests the configured base URL and returns parsed JSON', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ total: 2 })));

		await expect(fpaApiGet('/rankings?limit=2')).resolves.toEqual({ total: 2 });

		const [url, init] = fetchSpy.mock.calls[0]!;
		expect(url).toBe('https://fpa-api.test/rankings?limit=2');
		expect((init as RequestInit).headers).toMatchObject({ accept: 'application/json' });
	});

	it('does not produce a double slash when the base URL has a trailing slash', async () => {
		env.FPA_API_URL = 'https://fpa-api.test/';
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({})));

		await fpaApiGet('/rankings');

		expect(fetchSpy.mock.calls[0]![0]).toBe('https://fpa-api.test/rankings');
	});

	it('throws a typed error when the API is not configured', async () => {
		// Empty is how an unset var arrives from $env/dynamic/private.
		env.FPA_API_URL = '';
		const fetchSpy = vi.spyOn(globalThis, 'fetch');

		await expect(fpaApiGet('/rankings')).rejects.toThrow(FpaApiError);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('throws with the status when the API returns an error', async () => {
		// fpa-api answers 503 while its index is still loading.
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('{"error":"loading"}', { status: 503 })
		);

		await expect(fpaApiGet('/rankings')).rejects.toMatchObject({
			name: 'FpaApiError',
			status: 503
		});
	});

	it('wraps a network failure rather than letting it escape', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

		await expect(fpaApiGet('/rankings')).rejects.toMatchObject({
			name: 'FpaApiError',
			// No status: the request never reached the server.
			status: undefined
		});
	});

	it('wraps a timeout', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(
			Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' })
		);

		await expect(fpaApiGet('/rankings')).rejects.toThrow(FpaApiError);
	});

	it('wraps a malformed JSON body', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json'));

		await expect(fpaApiGet('/rankings')).rejects.toThrow(/malformed/);
	});
});
