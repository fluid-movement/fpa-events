<script lang="ts">
	import './layout.css';
	import '@fontsource-variable/nunito';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import TopNavigation from '$lib/components/TopNavigation.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" />
	<title>FPA Events</title>
</svelte:head>

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<TopNavigation />
		<main class="p-4 md:p-8">
			{@render children?.()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
