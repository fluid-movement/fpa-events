<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '#lib/components/ui/sidebar';
	import { pageTitle } from '#lib/config/pageTitle';

	const title = $derived(pageTitle(page.url.pathname, page.data));
</script>

<header
	class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-2 backdrop-blur-sm md:hidden"
>
	<Sidebar.Trigger class="size-10 shrink-0" />
	<p class="min-w-0 truncate font-semibold" data-testid="mobile-page-title">{title}</p>
</header>
