<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { useSidebar } from '#lib/components/ui/sidebar/context.svelte.js';
	import { routeActive } from '#lib/config/sidebarMenu';
	import HouseIcon from '@lucide/svelte/icons/house';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CircleUserRoundIcon from '@lucide/svelte/icons/circle-user-round';
	import LogInIcon from '@lucide/svelte/icons/log-in';
	import MenuIcon from '@lucide/svelte/icons/menu';

	const sidebar = useSidebar();

	// The personal slot is a sign-in wall when signed out (/dashboard redirects),
	// so it changes destination rather than sending people into a bounce.
	const signedIn = $derived(!!page.data.signedIn);

	const items = $derived([
		{ label: 'Home', url: resolve('/'), icon: HouseIcon },
		{ label: 'Events', url: resolve('/events'), icon: CalendarIcon },
		signedIn
			? { label: 'You', url: resolve('/dashboard'), icon: CircleUserRoundIcon }
			: { label: 'Sign in', url: resolve('/sign-in'), icon: LogInIcon }
	]);

	// Slide away while reading, come back on the way up — the same gesture that
	// collapses Safari's URL bar, so the two stop competing for the bottom edge.
	let hidden = $state(false);

	$effect(() => {
		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
		// Motion-sensitive users get a bar that simply stays put.
		if (reduced.matches) return;

		let lastY = window.scrollY;

		const onScroll = () => {
			const y = window.scrollY;
			const delta = y - lastY;
			// Ignore jitter and rubber-banding past either end.
			if (Math.abs(delta) < 6 || y < 0) return;
			hidden = y > 80 && delta > 0;
			lastY = y;
		};

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	// Never leave the bar hidden across a navigation.
	$effect(() => {
		if (page.url.pathname) hidden = false;
	});
</script>

<!-- Primary navigation on a phone. The sidebar sheet still holds everything;
     this is the thumb-reachable shortcut to the places people live in. -->
<nav
	class="surface-sunken fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out md:hidden
		{hidden ? 'translate-y-full' : 'translate-y-0'}"
	aria-label="Primary"
	data-testid="mobile-tab-bar"
	data-hidden={hidden}
	onfocusin={() => (hidden = false)}
>
	{#each items as item (item.label)}
		{@const active = routeActive(item.url, page.url.pathname)}
		<a
			href={item.url}
			aria-current={active ? 'page' : undefined}
			data-testid="mobile-tab-{item.label.toLowerCase().replace(' ', '-')}"
			class="flex min-h-14 flex-col items-center justify-center gap-1 pb-1.5 text-[0.6875rem] font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50
				{active ? 'text-primary' : 'text-muted-foreground'}"
		>
			<item.icon class="size-5" />
			{item.label}
		</a>
	{/each}
	<button
		type="button"
		onclick={() => sidebar.setOpenMobile(true)}
		data-testid="mobile-tab-more"
		class="flex min-h-14 flex-col items-center justify-center gap-1 pb-1.5 text-[0.6875rem] font-medium text-muted-foreground transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
	>
		<MenuIcon class="size-5" />
		More
	</button>
</nav>
