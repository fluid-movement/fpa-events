<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	interface ScheduleItem {
		id: string;
		name: string;
		description?: string | null;
		startDate: Date;
		endDate: Date;
		locationName?: string | null;
	}

	interface Props {
		item: ScheduleItem;
		onEdit?: () => void;
		deleteFormAction?: string;
	}

	let { item, onEdit, deleteFormAction }: Props = $props();

	function formatTime(d: Date) {
		return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	const hasActions = $derived(!!onEdit || !!deleteFormAction);
</script>

<div class="rounded-lg border bg-card p-4">
	<div class="flex items-start gap-3">
		<div class="flex-1 min-w-0">
			<p class="font-semibold">{item.name}</p>
			{#if item.description}
				<p class="text-sm text-muted-foreground mt-0.5">{item.description}</p>
			{/if}
			{#if item.locationName}
				<div class="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
					<MapPinIcon class="size-3.5 shrink-0" />
					<span>{item.locationName}</span>
				</div>
			{/if}
			<div class="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
				<ClockIcon class="size-3.5 shrink-0" />
				<span>{formatTime(item.startDate)} → {formatTime(item.endDate)}</span>
			</div>
		</div>
		{#if hasActions}
			<div class="flex items-center gap-1 shrink-0">
				{#if onEdit}
					<Button variant="ghost" size="icon" class="size-7" onclick={onEdit}>
						<PencilIcon class="size-3.5" />
					</Button>
				{/if}
				{#if deleteFormAction}
					<form
						method="POST"
						action={deleteFormAction}
						use:enhance={({ cancel }) => {
							if (!confirm('Delete this schedule item?')) {
								cancel();
								return;
							}
						}}
					>
						<input type="hidden" name="id" value={item.id} />
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
