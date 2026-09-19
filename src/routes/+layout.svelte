<script lang="ts">
	import './layout.css';
	import '@fontsource-variable/nunito';
	import * as Sidebar from '#lib/components/ui/sidebar';
	import AppSidebar from '#lib/components/AppSidebar.svelte';
	import TopNavigation from '#lib/components/TopNavigation.svelte';
	import MobileTabBar from '#lib/components/layout/MobileTabBar.svelte';

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
		<!-- Sidebar.Inset already renders a <main>, so this is a plain wrapper.
		     The bottom padding clears the mobile tab bar and the home indicator. -->
		<div class="p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:p-8">
			{@render children?.()}
		</div>
		<MobileTabBar />
	</Sidebar.Inset>
</Sidebar.Provider>
