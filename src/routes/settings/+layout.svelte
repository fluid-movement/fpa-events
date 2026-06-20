<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ label: 'Profile', href: resolve('/settings/profile') },
		{ label: 'Password', href: resolve('/settings/password') }
	];
</script>

<div class="max-w-2xl mx-auto">
	<div class="space-y-2 pb-6">
		<h1>Settings</h1>
		<p class="text-muted-foreground">Manage your account settings.</p>
	</div>

	<div class="mb-6 flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
		{#each tabs as tab (tab.href)}
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={tab.href}
				class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {page.url.pathname.startsWith(tab.href) ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
			>
				{tab.label}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/each}
	</div>

	{@render children()}
</div>
