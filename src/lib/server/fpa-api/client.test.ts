import { describe, it, expect, vi, afterEach } from 'vitest';
import { FPA_API_URL, setEnv } from '../../../test/mocks/app-env-private';
import { fpaApiGet as get, FpaApiError, MAX_BODY_BYTES, type Shape } from './client';

// The mocked env sets FPA_API_URL to https://fpa-api.test (see mocks/app-env-private.ts).
const ORIGINAL_URL = FPA_API_URL;

const anything = (() => true) as unknown as Shape<unknown>;
const fpaApiGet = (path: string) => get(path, anything);

afterEach(() => {
	setEnv({ FPA_API_URL: ORIGINAL_URL });
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
		setEnv({ FPA_API_URL: 'https://fpa-api.test/' });
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({})));

		await fpaApiGet('/rankings');

		expect(fetchSpy.mock.calls[0]![0]).toBe('https://fpa-api.test/rankings');
	});

	it('throws a typed error when the API is not configured', async () => {
		// Empty is how a blank var arrives from $app/env/private.
		setEnv({ FPA_API_URL: '' });
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

	it('refuses a declared Content-Length over the limit without reading it', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('{}', { headers: { 'content-length': String(MAX_BODY_BYTES + 1) } })
		);

		await expect(fpaApiGet('/rankings')).rejects.toThrow(/too large/);
	});

	it('stops reading a streamed body that grows past the limit', async () => {
		const chunk = new Uint8Array(512 * 1024).fill(32);
		let sent = 0;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				sent++;
				controller.enqueue(chunk); // never ends
			}
		});
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body));

		await expect(fpaApiGet('/rankings')).rejects.toThrow(/too large/);
		expect(sent * chunk.byteLength).toBeLessThan(MAX_BODY_BYTES + 4 * chunk.byteLength);
	});

	it('does not follow redirects and fails on one', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(
				new Response(null, { status: 302, headers: { location: 'http://evil.test/' } })
			);

		await expect(fpaApiGet('/rankings')).rejects.toMatchObject({
			name: 'FpaApiError',
			status: 302
		});
		expect((fetchSpy.mock.calls[0]![1] as RequestInit).redirect).toBe('manual');
	});

	it('turns a body of the wrong shape into an FpaApiError', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}'));
		const hasItems: Shape<{ items: unknown[] }> = (v): v is { items: unknown[] } =>
			typeof v === 'object' && v !== null && Array.isArray((v as { items?: unknown }).items);

		await expect(get('/events', hasItems)).rejects.toThrow(FpaApiError);
		await expect(get('/events', hasItems)).rejects.toThrow(/unexpected shape/);
	});
});
