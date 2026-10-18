import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { sentrySvelteKit } from '@sentry/sveltekit/vite';
import svelteOptions from './svelte-options.js';

// Source maps go to GlitchTip at build time, when `SENTRY_AUTH_TOKEN` is set
// (a Coolify build arg). Without it, dev and test builds skip the upload.
// `SENTRY_URL` points the plugin at GlitchTip; the release name is the commit
// Coolify is building and is injected into the bundles for the SDK to report.
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
	// Kit 3 takes what used to live in svelte.config.js as a plugin argument.
	plugins: [
		tailwindcss(),
		// Must come before `sveltekit()`.
		sentrySvelteKit({
			autoUploadSourceMaps: uploadSourceMaps,
			autoInstrument: false,
			telemetry: false,
			sentryUrl: process.env.SENTRY_URL,
			org: process.env.SENTRY_ORG ?? 'fpa',
			project: process.env.SENTRY_PROJECT ?? 'events-new',
			authToken: process.env.SENTRY_AUTH_TOKEN,
			release: { name: process.env.SENTRY_RELEASE ?? process.env.SOURCE_COMMIT }
		}),
		sveltekit(svelteOptions)
	],
	server: {
		watch: {
			// Playwright writes traces and its HTML report into the project while the
			// suite is running, and the dev server was logging a full
			// `[vite] page reload` for each write. Reloading the page mid-test aborts
			// whatever request is in flight, so keep these build artifacts out of the
			// watcher.
			ignored: ['**/node_modules/**', '**/.git/**', '**/test-results/**', '**/playwright-report/**']
		}
	},
	test: {
		include: ['src/**/*.test.ts'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['src/test/setup.ts'],
		// Exact matches only. A bare string alias also matches everything *under*
		// the id, which would send `#lib/server/db/schema` to the db mock instead of
		// the real table definitions, and `$app/paths/internal/server` (imported by
		// SvelteKit's own runtime) to the paths mock.
		//
		// `#lib` replaced `$lib` in Kit 3, so these patterns no longer need to
		// escape a leading `$` — but they are still anchored for the reason above.
		alias: [
			{ find: /^\$app\/paths$/, replacement: '/src/test/mocks/app-paths.ts' },
			{ find: /^\$app\/state$/, replacement: '/src/test/mocks/app-state.ts' },
			{ find: /^\$app\/server$/, replacement: '/src/test/mocks/app-server.ts' },
			{ find: /^#lib\/server\/db$/, replacement: '/src/test/mocks/db.ts' },
			{ find: /^\$app\/env\/private$/, replacement: '/src/test/mocks/app-env-private.ts' },
			{ find: /^\$app\/env\/public$/, replacement: '/src/test/mocks/app-env-public.ts' }
		]
	},
	resolve: {
		conditions: ['browser']
	}
});
