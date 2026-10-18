// Formerly `svelte.config.js`. SvelteKit 3 throws if a file by that name
// exists at the project root — options now reach Kit through the
// `sveltekit()` Vite plugin instead, and no longer sit inside a `kit`
// namespace. They still have to be a plain object somewhere, because
// `eslint-plugin-svelte` wants the same shape, so both `vite.config.ts` and
// `eslint.config.js` import this.
import adapter from '@sveltejs/adapter-node';
import { loadEnv } from 'vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Origin of the GlitchTip server, from the public DSN, so the browser SDK is
 * allowed to post events to it. The CSP is fixed at build time, so the DSN has
 * to be present at build (a Coolify build arg) as well as at runtime.
 */
function glitchTipOrigin() {
	const dsn =
		process.env.PUBLIC_GLITCHTIP_DSN ??
		loadEnv('production', process.cwd(), '').PUBLIC_GLITCHTIP_DSN;
	try {
		return dsn ? [/** @type {`${string}://${string}.${string}`} */ (new URL(dsn).origin)] : [];
	} catch {
		return [];
	}
}

/** @type {import('@sveltejs/kit/vite').Config} */
const config = {
	preprocess: vitePreprocess(),

	adapter: adapter({ out: 'build' }),

	// Defence in depth for the organizer-written rich text the app renders.
	// Kit adds a nonce for its own inline hydration script. Allow exactly what
	// the browser loads; every other security header is set in `handle`.
	csp: {
		mode: 'auto',
		directives: {
			'default-src': ['self'],
			// Turnstile's widget script (sign-up, sign-in).
			'script-src': ['self', 'https://challenges.cloudflare.com'],
			// Svelte, bits-ui and Leaflet set inline `style` attributes. With
			// 'unsafe-inline' here Kit leaves styles un-nonced, as it must:
			// a nonce would make browsers ignore 'unsafe-inline'.
			'style-src': ['self', 'unsafe-inline'],
			// Event images on R2, OSM tiles, Leaflet's data-URI icons, and the
			// blob: preview ImageUpload shows before the upload finishes. R2's
			// host is an env var, so images are allowed from any https origin.
			'img-src': ['self', 'data:', 'blob:', 'https:'],
			'font-src': ['self', 'data:'],
			// Photon place search runs in the browser (GeocodingCombobox); the error
			// tracker's origin is added when a DSN is configured.
			'connect-src': ['self', 'https://photon.komoot.io', ...glitchTipOrigin()],
			'frame-src': ['https://challenges.cloudflare.com'],
			'frame-ancestors': ['none'],
			'object-src': ['none'],
			'base-uri': ['self'],
			'form-action': ['self']
		}
	},
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
