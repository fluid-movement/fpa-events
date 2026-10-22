import { FPA_API_URL } from '$app/env/private';

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
 * The largest body read. The biggest legitimate answer is a 500-row standings
 * page (~200 KB uncompressed), so this leaves ample room and still stops a
 * runaway answer from being buffered whole.
 */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Checks the top-level shape the caller dereferences. */
export type Shape<T> = (value: unknown) => value is T;

/** Read a body up to `MAX_BODY_BYTES`, counting the bytes actually streamed. */
async function readLimited(response: Response, path: string): Promise<string> {
	const tooLarge = () => new FpaApiError(`Rankings API response too large for ${path}`);

	const declared = Number(response.headers.get('content-length'));
	if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
		await response.body?.cancel().catch(() => {});
		throw tooLarge();
	}

	if (!response.body) return '';
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let received = 0;
	let body = '';
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		received += value.byteLength;
		if (received > MAX_BODY_BYTES) {
			await reader.cancel().catch(() => {});
			throw tooLarge();
		}
		body += decoder.decode(value, { stream: true });
	}
	return body + decoder.decode();
}

/**
 * GET a JSON path from fpa-api.
 *
 * `path` must start with `/` and already be URL-encoded where needed. Ids from
 * the browser must be validated (`fpaId`) before they are put in a path: a `.`
 * or `..` survives `encodeURIComponent` and the URL parser resolves it.
 *
 * Redirects are not followed, the body is size-bounded, and `shape` must accept
 * the parsed JSON — every failure is an `FpaApiError`.
 */
export async function fpaApiGet<T>(path: string, shape: Shape<T>): Promise<T> {
	const baseUrl = FPA_API_URL?.replace(/\/+$/, '');
	if (!baseUrl) {
		throw new FpaApiError('FPA_API_URL is not configured');
	}

	let response: Response;
	let body: string;
	try {
		response = await fetch(`${baseUrl}${path}`, {
			headers: { accept: 'application/json' },
			// fpa-api never redirects a read; one that does is misconfigured or hostile.
			redirect: 'manual',
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});

		if (response.status >= 300 && response.status < 400) {
			await response.body?.cancel().catch(() => {});
			throw new FpaApiError(`Rankings API redirected ${path}`, response.status);
		}
		if (!response.ok) {
			await response.body?.cancel().catch(() => {});
			throw new FpaApiError(
				`Rankings API returned ${response.status} for ${path}`,
				response.status
			);
		}
		body = await readLimited(response, path);
	} catch (error) {
		if (error instanceof FpaApiError) throw error;
		// Network failure, DNS, or timeout — never surfaced as an unhandled throw.
		const reason = error instanceof Error ? error.message : String(error);
		throw new FpaApiError(`Could not reach the rankings API: ${reason}`);
	}

	let data: unknown;
	try {
		data = JSON.parse(body);
	} catch {
		throw new FpaApiError(`Rankings API returned a malformed response for ${path}`);
	}
	if (!shape(data)) {
		throw new FpaApiError(`Rankings API returned an unexpected shape for ${path}`);
	}
	return data;
}
