import { resolve } from '$app/paths';

// `base` was removed from `$app/paths` in SvelteKit 3; `resolve` already
// accounts for it.
export const eventPath = (id: string) => resolve('/events/[id]', { id });

/**
 * A post-sign-in destination taken from the query string, or `fallback`.
 *
 * Only same-origin paths are honoured — `/invite/abc`, not `//evil.com` or
 * `https://evil.com` — so `?redirect=` cannot be turned into an open redirect.
 */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
		return fallback;
	}
	const origin = 'http://same-origin.invalid';
	try {
		const url = new URL(value, origin);
		if (url.origin !== origin) return fallback;
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return fallback;
	}
}

/** `path` with `?redirect=` set when there is somewhere to come back to. */
export function withRedirect(path: string, redirectTo: string | null): string {
	return redirectTo ? `${path}?redirect=${encodeURIComponent(redirectTo)}` : path;
}
