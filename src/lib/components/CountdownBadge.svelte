<script lang="ts">
	import { Badge } from '#lib/components/ui/badge';
	import { daysUntil, countdownLabel } from '#lib/utils/dates';

	let { startDate, class: className }: { startDate: Date | string; class?: string } = $props();

	const days = $derived(daysUntil(startDate));
	// Inside a week is the "start packing" threshold — that one gets the accent.
	const imminent = $derived(days <= 7);
</script>

<Badge variant={imminent ? 'default' : 'outline'} class={className}>
	{countdownLabel(days)}
</Badge>
