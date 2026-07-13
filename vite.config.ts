import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['src/test/setup.ts'],
		alias: {
			'$app/paths': '/src/test/mocks/app-paths.ts',
			'$app/state': '/src/test/mocks/app-state.ts',
			'$lib/server/db': '/src/test/mocks/db.ts',
			'$env/dynamic/private': '/src/test/mocks/env-dynamic-private.ts',
			'$env/dynamic/public': '/src/test/mocks/env-dynamic-public.ts'
		}
	},
	resolve: {
		conditions: ['browser']
	}
});
