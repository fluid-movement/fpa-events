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
});
