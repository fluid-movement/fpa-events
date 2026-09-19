<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import RichContent from '#lib/components/RichContent.svelte';
	import type { ScheduleItem } from '#lib/types/event';
	import { formatTime } from '#lib/utils/dates';

	interface Props {
		item: ScheduleItem;
		onEdit?: () => void;
		onDelete?: () => void;
	}

	let { item, onEdit, onDelete }: Props = $props();

	const hasActions = $derived(!!onEdit || !!onDelete);
</script>

<div class="surface-row rounded-lg p-4">
	<div class="flex items-start gap-3">
		<div class="min-w-0 flex-1">
			<p class="font-semibold">{item.name}</p>
			{#if item.locationName}
				<div class="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
					<MapPinIcon class="size-3.5 shrink-0" />
					<span>{item.locationName}</span>
				</div>
			{/if}
			<div class="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
				<ClockIcon class="size-3.5 shrink-0" />
				<span>{formatTime(item.startDate)} → {formatTime(item.endDate)}</span>
			</div>
			{#if item.description}
				<div class="mt-1">
					<RichContent content={item.description} class="text-sm text-muted-foreground" />
				</div>
			{/if}
		</div>
		{#if hasActions}
			<div class="flex shrink-0 items-center gap-1">
				{#if onEdit}
					<Button variant="ghost" size="icon-sm" aria-label="Edit {item.name}" onclick={onEdit}>
						<PencilIcon class="size-3.5" />
					</Button>
				{/if}
				{#if onDelete}
					<!-- Confirmation lives in ScheduleList, which owns the delete form. -->
					<Button
						variant="ghost"
						size="icon-sm"
						class="text-destructive hover:text-destructive"
						aria-label="Delete {item.name}"
						onclick={onDelete}
					>
						<TrashIcon class="size-3.5" />
					</Button>
				{/if}
			</div>
		{/if}
	</div>
</div>
