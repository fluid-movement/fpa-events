import { describe, it, expect, vi, afterEach } from 'vitest';
import { TtlCache, cachedFpaApiGet, resetFpaApiCache } from './cache';
import { FpaApiError, type Shape } from './client';

afterEach(() => {
	resetFpaApiCache();
	vi.restoreAllMocks();
});

describe('TtlCache', () => {
	it('serves a hit without loading again, and reloads after the TTL', async () => {
		let now = 0;
		const cache = new TtlCache<number>(1000, 10, () => now);
		const load = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

		expect(await cache.get('a', load)).toBe(1);
		now = 999;
		expect(await cache.get('a', load)).toBe(1);
		expect(load).toHaveBeenCalledTimes(1);
		now = 1000;
		expect(await cache.get('a', load)).toBe(2);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('shares one load between concurrent callers', async () => {
		const cache = new TtlCache<number>();
		const load = vi.fn().mockResolvedValue(1);
		await Promise.all([cache.get('a', load), cache.get('a', load)]);
		expect(load).toHaveBeenCalledTimes(1);
	});

	it('does not cache a failure, nor lose a good entry to one', async () => {
		const cache = new TtlCache<number>();
		const load = vi.fn().mockRejectedValueOnce(new FpaApiError('down')).mockResolvedValueOnce(7);

		await expect(cache.get('a', load)).rejects.toThrow('down');
		expect(await cache.get('a', load)).toBe(7);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it('is bounded: the oldest entry is evicted', async () => {
		const cache = new TtlCache<number>(1000, 2);
		const load = vi.fn(async () => 1);
		await cache.get('a', load);
		await cache.get('b', load);
		await cache.get('c', load);
		expect(load).toHaveBeenCalledTimes(3);
		await cache.get('b', load);
		await cache.get('c', load);
		expect(load).toHaveBeenCalledTimes(3);
		await cache.get('a', load);
		expect(load).toHaveBeenCalledTimes(4);
	});
});

describe('cachedFpaApiGet', () => {
	it('costs one upstream request for repeated reads of one path, and none are cached on outage', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response('x', { status: 503 }))
			.mockImplementation(async () => new Response('{"ok":1}'));
		const any = (() => true) as unknown as Shape<unknown>;

		await expect(cachedFpaApiGet('/players/a', any)).rejects.toThrow(FpaApiError);
		await cachedFpaApiGet('/players/a', any);
		await cachedFpaApiGet('/players/a', any);
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});
