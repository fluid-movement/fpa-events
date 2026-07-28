<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import PageShell from '$lib/components/layout/PageShell.svelte';
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import SegmentedTabs from '$lib/components/layout/SegmentedTabs.svelte';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ label: 'Profile', href: resolve('/settings/profile') },
		{ label: 'Password', href: resolve('/settings/password') },
		{ label: 'Privacy', href: resolve('/settings/privacy'), testid: 'settings-tab-privacy' },
		{ label: 'Account', href: resolve('/settings/account') }
	];
</script>

<PageShell width="form">
	<PageHeader title="Settings" description="Manage your account settings." />

	<SegmentedTabs {tabs} current={page.url.pathname} label="Settings" class="mb-6" />

	{@render children()}
</PageShell>
