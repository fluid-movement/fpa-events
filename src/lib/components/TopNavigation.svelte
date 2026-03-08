<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import Logo from './Logo.svelte';
</script>

<header class="flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 md:hidden sticky top-0 z-10">
	<Sidebar.Trigger />
	<div class="flex-1">
		<Logo />
	</div>
</header>
