// Stands in for `$app/server` under Vitest (aliased in vite.config.ts).
//
// SvelteKit 3 resolves `$app/server` to a module that throws `invalid import`
// outside a server build, so any unit test that merely *imports* a module
// touching it — `#lib/server/authz`, for instance — fails at import time even
// when the test only exercises pure helpers in that file.
//
// `getRequestEvent` throws rather than returning a hollow event: nothing in the
// unit suite legitimately needs a request, and a loud failure beats a test
// quietly passing against a fake one. A test that genuinely needs it should
// mock it per-case with `vi.mock`.
export function getRequestEvent(): never {
	throw new Error(
		'getRequestEvent() is not available in unit tests — mock the calling module instead.'
	);
}
