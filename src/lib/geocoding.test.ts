import { afterEach, describe, expect, it, vi } from 'vitest';
import { autocomplete } from './geocoding';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('autocomplete', () => {
	// The admin schedule load relies on this to bound its Photon fallback; without
	// it a slow Photon held the whole tab's navigation open.
	it('forwards the abort signal to fetch', async () => {
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ features: [] }));
		vi.stubGlobal('fetch', fetchMock);
		const signal = AbortSignal.timeout(2000);

		await autocomplete('Berlin', 1, signal);

		expect(fetchMock).toHaveBeenCalledWith(expect.any(String), { signal });
	});

	// The server calls this with organizer-typed location text. URL syntax in it
	// must stay inside `q`: never a new path, userinfo, host, fragment or query.
	it('keeps URL syntax in the query text inside q, on the Photon host', async () => {
		const fetchMock = vi.fn().mockResolvedValue(Response.json({ features: [] }));
		vi.stubGlobal('fetch', fetchMock);
		const query = 'a/../b @evil.example.com/x #frag ?limit=999&q=other';

		await autocomplete(query, 3);

		const requested = new URL(fetchMock.mock.calls[0][0]);
		expect(requested.origin).toBe('https://photon.komoot.io');
		expect(requested.username).toBe('');
		expect(requested.pathname).toBe('/api/');
		expect(requested.hash).toBe('');
		expect([...requested.searchParams.keys()].sort()).toEqual(['limit', 'q']);
		expect(requested.searchParams.get('q')).toBe(query);
		expect(requested.searchParams.get('limit')).toBe('3');
	});
});
