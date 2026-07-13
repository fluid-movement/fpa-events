<script module lang="ts">
	import { env } from '$env/dynamic/public';

	/** Whether Turnstile is configured. Forms use this to know if a token is required. */
	export const captchaEnabled = !!env.PUBLIC_TURNSTILE_SITE_KEY;

	const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

	type TurnstileApi = {
		render: (
			el: HTMLElement,
			opts: {
				sitekey: string;
				callback: (token: string) => void;
				'error-callback'?: () => void;
				'expired-callback'?: () => void;
			}
		) => string;
		reset: (id?: string) => void;
	};

	declare global {
		interface Window {
			turnstile?: TurnstileApi;
			onloadTurnstileCallback?: () => void;
		}
	}

	let scriptPromise: Promise<void> | null = null;

	/** Load the Cloudflare script once, resolving when window.turnstile is ready. */
	function loadTurnstile(): Promise<void> {
		if (window.turnstile) return Promise.resolve();
		if (scriptPromise) return scriptPromise;

		scriptPromise = new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = SCRIPT_SRC;
			script.async = true;
			script.defer = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Turnstile script'));
			document.head.appendChild(script);
		});
		return scriptPromise;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let { token = $bindable('') }: { token?: string } = $props();

	let container = $state<HTMLDivElement>();
	let widgetId: string | undefined;

	export function reset() {
		token = '';
		if (widgetId !== undefined) window.turnstile?.reset(widgetId);
	}

	onMount(() => {
		if (!captchaEnabled || !container) return;
		let cancelled = false;

		loadTurnstile()
			.then(() => {
				if (cancelled || !container || !window.turnstile) return;
				widgetId = window.turnstile.render(container, {
					sitekey: env.PUBLIC_TURNSTILE_SITE_KEY ?? '',
					callback: (t) => (token = t),
					'error-callback': () => (token = ''),
					'expired-callback': () => (token = '')
				});
			})
			.catch((err) => console.error('[turnstile]', err));

		return () => {
			cancelled = true;
		};
	});
</script>

{#if captchaEnabled}
	<div bind:this={container} data-testid="turnstile"></div>
{/if}
