// Formerly `svelte.config.js`. SvelteKit 3 throws if a file by that name
// exists at the project root — options now reach Kit through the
// `sveltekit()` Vite plugin instead, and no longer sit inside a `kit`
// namespace. They still have to be a plain object somewhere, because
// `eslint-plugin-svelte` wants the same shape, so both `vite.config.ts` and
// `eslint.config.js` import this.
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),

	adapter: adapter({ out: 'build' }),
	experimental: {
		remoteFunctions: true
	},
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};

export default config;
