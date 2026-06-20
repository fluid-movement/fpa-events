<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ScheduleItemCard from './ScheduleItemCard.svelte';
	import ScheduleItemForm from './ScheduleItemForm.svelte';
	import type { ScheduleItem, EventLocation } from '$lib/types/event';
	import { toISODate } from '$lib/utils/dates';

	interface Props {
		schedules: ScheduleItem[];
		editable?: boolean;
		eventDays?: string[];
		locations?: EventLocation[];
	}

	let { schedules, editable = false, eventDays, locations }: Props = $props();

	let editingId = $state<string | null>(null);
	let addingForDay = $state<string | null>(null);

	const groupedSchedules = $derived.by(() => {
		const sorted = [...schedules].sort(
			(a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
		);
		const groups = new SvelteMap<string, typeof schedules>();
		for (const item of sorted) {
			const dayKey = new Date(item.startDate).toDateString();
			if (!groups.has(dayKey)) groups.set(dayKey, []);
			groups.get(dayKey)!.push(item);
		}
		return [...groups.entries()];
	});

	function formatDayHeading(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	}

	function locationNameForItem(item: ScheduleItem): string | null {
		if (item.locationName) return item.locationName;
		if (item.locationId && locations) {
			return locations.find((l) => l.id === item.locationId)?.name ?? null;
		}
		return null;
	}

	function itemWithResolvedLocation(item: ScheduleItem): ScheduleItem {
		return { ...item, locationName: locationNameForItem(item) };
	}
</script>

<div class="space-y-8">
	{#if groupedSchedules.length === 0 && (!editable || addingForDay === null)}
		<p class="py-8 text-center text-muted-foreground">No schedule items yet.</p>
	{/if}

	{#each groupedSchedules as [dayKey, items] (dayKey)}
		<div class="space-y-3">
			<h2 class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				{formatDayHeading(dayKey)}
			</h2>
			<div class="space-y-2">
				{#each items as item (item.id)}
					{#if editable && editingId === item.id}
						<ScheduleItemForm
							mode="edit"
							{item}
							eventDays={eventDays ?? []}
							locations={locations ?? []}
							formAction="?/updateSchedule"
							onCancel={() => (editingId = null)}
							onSuccess={() => (editingId = null)}
						/>
					{:else}
						<ScheduleItemCard
							item={itemWithResolvedLocation(item)}
							onEdit={editable ? () => (editingId = item.id) : undefined}
							deleteFormAction={editable ? '?/deleteSchedule' : undefined}
						/>
					{/if}
				{/each}

				{#if editable}
					{#if addingForDay === dayKey}
						<ScheduleItemForm
							mode="add"
							eventDays={eventDays ?? []}
							locations={locations ?? []}
							initialDay={toISODate(new Date(dayKey))}
							formAction="?/addSchedule"
							onCancel={() => (addingForDay = null)}
							onSuccess={() => (addingForDay = null)}
						/>
					{:else}
						<Button
							variant="ghost"
							size="sm"
							class="w-full border border-dashed text-muted-foreground"
							onclick={() => (addingForDay = dayKey)}
						>
							<PlusIcon class="size-4" />
							Add item for {formatDayHeading(dayKey)}
						</Button>
					{/if}
				{/if}
			</div>
		</div>
	{/each}

	{#if editable}
		{#if addingForDay === 'new'}
			<ScheduleItemForm
				mode="add"
				eventDays={eventDays ?? []}
				locations={locations ?? []}
				formAction="?/addSchedule"
				onCancel={() => (addingForDay = null)}
				onSuccess={() => (addingForDay = null)}
			/>
		{:else}
			<div class="space-y-3">
				<Button variant="outline" size="sm" onclick={() => (addingForDay = 'new')}>
					<PlusIcon class="size-4" />
					Add Schedule Item
				</Button>
			</div>
		{/if}
	{/if}
</div>
