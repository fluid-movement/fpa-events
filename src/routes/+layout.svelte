<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/AppSidebar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" />
</svelte:head>

<ModeWatcher />
<Sidebar.Provider>
	<AppSidebar />
	<main class="w-full p-4 md:p-8">
		<Sidebar.Trigger />
		{@render children?.()}
	</main>
</Sidebar.Provider>
