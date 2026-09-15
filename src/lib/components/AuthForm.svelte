<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { captchaEnabled } from '$lib/components/Turnstile.svelte';

	let {
		submitLabel,
		pendingLabel,
		loading = false,
		error = '',
		captchaToken = null,
		onsubmit,
		children,
		aboveSubmit
	}: {
		submitLabel: string;
		pendingLabel: string;
		loading?: boolean;
		error?: string;
		/**
		 * The Turnstile token, for forms that render the widget. Leave unset on
		 * forms that do not — `null` means "this form has no captcha to wait for".
		 */
		captchaToken?: string | null;
		onsubmit: () => void;
		children: Snippet;
		/** Between the error line and the submit button — the Turnstile widget, mainly. */
		aboveSubmit?: Snippet;
	} = $props();

	const awaitingCaptcha = $derived(captchaToken !== null && captchaEnabled && !captchaToken);
</script>

<!--
	The auth pages call Better Auth's client methods directly rather than a remote
	`form()`, so they track their own `loading` flag — see AGENTS.md. This wraps
	the parts that were identical across all four: the preventDefault, the error
	line, and a submit button that disables while in flight or without a captcha.
-->
<form
	class="grid gap-4"
	onsubmit={(e) => {
		e.preventDefault();
		onsubmit();
	}}
>
	{@render children()}

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}

	{#if aboveSubmit}
		{@render aboveSubmit()}
	{/if}

	<Button type="submit" class="w-full" disabled={loading || awaitingCaptcha}>
		{loading ? pendingLabel : submitLabel}
	</Button>
</form>
