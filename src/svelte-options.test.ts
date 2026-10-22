import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import svelteOptions from '../svelte-options.js';

// Kit's origin check is what turns a cross-site form-encoded, multipart or
// text/plain POST (to /api/events/upload-image, say) into a 403. It is on by
// default and only a config edit can open it: `checkOrigin: false` before Kit 3
// (Kit 3 refuses that key at startup, which fails this suite too),
// `trustedOrigins: ['*']` (or any foreign origin) since. The check itself only
// runs on a production build, so the integration suite on `vite dev` cannot see
// it go — this test is what fails instead.
//
// Remote functions have their own, non-configurable check; re-check both by hand
// on a production build after a Kit upgrade (see the hand-off notes).
describe('csrf origin check', () => {
	const csrf = (svelteOptions as { csrf?: { checkOrigin?: boolean; trustedOrigins?: string[] } })
		.csrf;

	it('is not switched off', () => {
		expect(csrf ?? {}).not.toHaveProperty('checkOrigin');
	});

	it('trusts no other origin', () => {
		expect(csrf?.trustedOrigins ?? []).toEqual([]);
	});

	it('is the config Kit actually gets', () => {
		// An inline options object in vite.config.ts would leave this file — and
		// the assertions above — describing a config nothing uses.
		// Vitest runs from the project root; `import.meta.url` is not a file URL under jsdom.
		const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
		expect(viteConfig).toMatch(/import svelteOptions from '\.\/svelte-options\.js'/);
		expect(viteConfig).toMatch(/sveltekit\(svelteOptions\)/);
	});
});
