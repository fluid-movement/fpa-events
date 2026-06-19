<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Event } from '$lib/types/event';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	let { event }: { event: Event } = $props();

	const start = $derived(new Date(event.startDate));
	const end = $derived(new Date(event.endDate));
	const sameDay = $derived(start.toDateString() === end.toDateString());
	const sameMonth = $derived(
		start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
	);

	const startDay = $derived(String(start.getDate()).padStart(2, '0'));
	const startMonth = $derived(start.toLocaleDateString('en-US', { month: 'short' }));

	const dateRange = $derived(
		sameDay
			? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
			: sameMonth
				? `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.getDate()}`
				: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
	);
</script>

<a href={resolve(`/events/${event.id}`)} class="card-link">
	<div class="glow"></div>
	<article class="card">
		<div class="chip">
			<span class="day">{startDay}</span>
			<span class="month">{startMonth}</span>
		</div>
		<div class="info">
			<h2>{event.name}</h2>
			<div class="location">
				<MapPinIcon class="size-3.5 shrink-0" />
				<span>{event.location}</span>
			</div>
			<div class="date-range">{dateRange}</div>
		</div>
	</article>
</a>

<style>
	.card-link {
		display: block;
		position: relative;
	}

	/* Circular glow behind the card, centered on the chip */
	.glow {
		position: absolute;
		inset: -30px;
		z-index: 0;
		background: radial-gradient(
			circle 110px at calc(30px + 56px) 50%,
			oklch(0.686 0.135 233 / 0.95) 0%,
			oklch(0.686 0.135 233 / 0.3) 60%,
			transparent 100%
		);
		filter: blur(18px);
		opacity: 0;
		transition: opacity 0.4s ease;
		pointer-events: none;
	}

	.card-link:hover .glow {
		opacity: 1;
	}

	.card {
		position: relative;
		z-index: 1;
		border-radius: 0.75rem;
		padding: 1.25rem;
		display: flex;
		gap: 1.25rem;
		height: 100%;
	}

	/* Opaque base blocks the glow from showing through the card */
	.card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: var(--card);
		z-index: 0;
	}

	/* Subtle glass highlight on top */
	.card::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: rgb(255 255 255 / 0.07);
		z-index: 0;
	}

	.card > * {
		position: relative;
		z-index: 1;
	}

	.chip {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--primary);
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		flex-shrink: 0;
		transition: filter 0.35s ease;
	}

	.card-link:hover .chip {
		filter: brightness(1.25);
	}

	.day {
		font-size: 2.25rem;
		font-weight: 900;
		line-height: 1;
		color: var(--primary-foreground);
		white-space: nowrap;
	}

	.month {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: color-mix(in oklch, var(--primary-foreground) 80%, transparent);
		margin-top: 0.125rem;
	}

	.info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
	}

	.info h2 {
		font-size: 1.25rem;
		font-weight: 700;
		line-height: 1.35;
	}

	.location {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-top: 0.125rem;
	}

	.location span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.date-range {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-top: 0.375rem;
	}
</style>
