import { fpaApiGet, type Shape } from './client';

/**
 * A short, bounded in-process cache for per-id fpa-api reads (player profiles,
 * event results). Without it every anonymous call to those remote queries cost
 * one upstream request, held open up to the client timeout.
 *
 * fpa-api refreshes hourly, so five minutes of staleness (the same trade as the
 * event index and standings) is harmless. Failures are never cached, and the
 * map is capped so a stream of distinct ids cannot grow memory without bound.
 */

export const CACHE_TTL_MS = 5 * 60 * 1000;
export const CACHE_MAX_ENTRIES = 500;

export class TtlCache<T> {
	private entries = new Map<string, { data: T; loadedAt: number }>();
	private inFlight = new Map<string, Promise<T>>();

	constructor(
		private ttlMs = CACHE_TTL_MS,
		private maxEntries = CACHE_MAX_ENTRIES,
		private now: () => number = Date.now
	) {}

	async get(key: string, load: () => Promise<T>): Promise<T> {
		const hit = this.entries.get(key);
		if (hit && this.now() - hit.loadedAt < this.ttlMs) return hit.data;

		let pending = this.inFlight.get(key);
		if (!pending) {
			pending = load()
				.then((data) => {
					this.store(key, data);
					return data;
				})
				.finally(() => {
					this.inFlight.delete(key);
				});
			this.inFlight.set(key, pending);
		}
		return pending;
	}

	private store(key: string, data: T): void {
		this.entries.delete(key);
		this.entries.set(key, { data, loadedAt: this.now() });
		// Map iterates in insertion order, so the first key is the oldest.
		while (this.entries.size > this.maxEntries) {
			this.entries.delete(this.entries.keys().next().value as string);
		}
	}

	clear(): void {
		this.entries.clear();
		this.inFlight.clear();
	}
}

const cache = new TtlCache<unknown>();

/** `fpaApiGet` through the shared cache, keyed on the upstream path. */
export function cachedFpaApiGet<T>(path: string, shape: Shape<T>): Promise<T> {
	return cache.get(path, () => fpaApiGet(path, shape)) as Promise<T>;
}

/** Test seam. Not used by the app. */
export function resetFpaApiCache(): void {
	cache.clear();
}
