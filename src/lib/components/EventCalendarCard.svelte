<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Event } from '$lib/types/event';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	let { event }: { event: Event } = $props();

	const start = $derived(new Date(event.startDate));
	const end = $derived(new Date(event.endDate));
	const sameDay = $derived(start.toDateString() === end.toDateString());
	const sameMonth = $derived(start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear());

	const dayRange = $derived(
		sameDay
			? String(start.getDate()).padStart(2, '0')
			: sameMonth
				? `${String(start.getDate()).padStart(2, '0')}–${String(end.getDate()).padStart(2, '0')}`
				: `${String(start.getDate()).padStart(2, '0')}–${String(end.getDate()).padStart(2, '0')}`
	);

	const monthLabel = $derived(
		sameMonth
			? start.toLocaleDateString('en-US', { month: 'long' })
			: `${start.toLocaleDateString('en-US', { month: 'short' })} – ${end.toLocaleDateString('en-US', { month: 'short' })}`
	);
</script>

<a href={resolve(`/events/${event.id}`)}>
	<article class="bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-lg shadow-md p-5 flex gap-5 relative z-0 transition-colors h-full">
		<!-- Date -->
		<div class="flex flex-col">
			<div class="tracking-tight text-4xl font-bold whitespace-nowrap">{dayRange}</div>
			<div class="text-sm text-muted-foreground">{monthLabel}</div>
		</div>

		<!-- Vertical divider -->
		<div class="bg-border self-stretch w-px shrink-0"></div>

		<!-- Info -->
		<div class="flex flex-col justify-center min-w-0">
			<h2 class="text-xl font-bold leading-snug">{event.name}</h2>
			<div class="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
				<MapPinIcon class="size-3.5 shrink-0" />
				<span class="truncate">{event.location}</span>
			</div>
		</div>
	</article>
</a>
