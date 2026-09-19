<script lang="ts">
	import { cn } from '#lib/utils';

	let { label, class: className }: { label: string; class?: string } = $props();
</script>

<!-- A section marker for long chronological lists — month headings in the event
     calendar, Upcoming/Past on the attending page. -->
<div class={cn('flex w-full items-center', className)}>
	<div class="h-px grow bg-border"></div>
	<span class="mx-4 shrink-0 text-sm font-medium whitespace-nowrap text-muted-foreground md:mx-6">
		{label}
	</span>
	<div class="h-px grow bg-border"></div>
</div>
