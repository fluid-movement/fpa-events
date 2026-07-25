import { env } from '$env/dynamic/private';

/**
 * Thin server-side client for fpa-api.
 *
 * The browser never talks to fpa-api directly — everything goes through remote
 * functions — so there is no CORS setup and no public URL to leak.
 *
 * fpa-api is an external dependency that can be down, redeploying, or still
 * warming its index (it answers 503 with Retry-After until its first load
 * completes). Every failure mode is funnelled into `FpaApiError` so callers can
 * degrade to an "unavailable" notice instead of taking a page down.
 */

export class FpaApiError extends Error {
	constructor(
		message: string,
		readonly status?: number
	) {
		super(message);
		this.name = 'FpaApiError';
	}
}

const TIMEOUT_MS = 10_000;

/**
 * GET a JSON path from fpa-api.
 *
 * `path` must start with `/` and already be URL-encoded where needed.
 */
export async function fpaApiGet<T>(path: string): Promise<T> {
	const baseUrl = env.FPA_API_URL?.replace(/\/+$/, '');
	if (!baseUrl) {
		throw new FpaApiError('FPA_API_URL is not configured');
	}

	let response: Response;
	try {
		response = await fetch(`${baseUrl}${path}`, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (error) {
		// Network failure, DNS, or timeout — never surfaced as an unhandled throw.
		const reason = error instanceof Error ? error.message : String(error);
		throw new FpaApiError(`Could not reach the rankings API: ${reason}`);
	}

	if (!response.ok) {
		throw new FpaApiError(`Rankings API returned ${response.status} for ${path}`, response.status);
	}

	try {
		return (await response.json()) as T;
	} catch {
		throw new FpaApiError(`Rankings API returned a malformed response for ${path}`);
	}
}
