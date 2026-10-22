import { FpaApiError } from './client';
import type { ApiResult } from '#lib/rankings/types';

/** What the browser is told about any upstream failure. */
export const UNAVAILABLE_MESSAGE = 'The rankings service is not reachable right now.';

/**
 * Run a fetch, converting an expected API outage into a renderable result.
 *
 * An `FpaApiError` message carries the upstream path and status, so the detail
 * goes to the server log and the browser gets a fixed message. Anything else
 * is a genuine bug and surfaces.
 */
export async function attempt<T>(source: string, fn: () => Promise<T>): Promise<ApiResult<T>> {
	try {
		return { ok: true, data: await fn() };
	} catch (error) {
		if (error instanceof FpaApiError) {
			console.warn(`[${source}] ${error.message}`);
			return { ok: false, message: UNAVAILABLE_MESSAGE };
		}
		throw error;
	}
}
