<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import type { ScheduleItem } from '$lib/types/event';
	import { formatTime } from '$lib/utils/dates';

	interface Props {
		item: ScheduleItem;
		eventId?: string;
		onEdit?: () => void;
		deleteForm?: Record<string, unknown>;
	}

	let { item, eventId, onEdit, deleteForm }: Props = $props();

	const hasActions = $derived(!!onEdit || !!deleteForm);

	function confirmDelete(event: SubmitEvent) {
		if (!confirm('Delete this schedule item?')) event.preventDefault();
	}
</script>

<div class="rounded-lg border bg-card p-4">
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
				<p class="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
			{/if}
		</div>
		{#if hasActions}
			<div class="flex shrink-0 items-center gap-1">
				{#if onEdit}
					<Button variant="ghost" size="icon" class="size-7" onclick={onEdit}>
						<PencilIcon class="size-3.5" />
					</Button>
				{/if}
				{#if deleteForm}
					<form {...deleteForm} onsubmit={confirmDelete}>
						<input type="hidden" name="id" value={item.id} />
						{#if eventId}<input type="hidden" name="eventId" value={eventId} />{/if}
						<Button
							type="submit"
							variant="ghost"
							size="icon"
							class="size-7 text-destructive hover:text-destructive"
						>
							<TrashIcon class="size-3.5" />
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</div>
