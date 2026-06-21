<script lang="ts">
	import { tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ScheduleItemCard from './ScheduleItemCard.svelte';
	import ScheduleItemForm from './ScheduleItemForm.svelte';
	import type { ScheduleItem, EventLocation } from '$lib/types/event';
	import { toISODate } from '$lib/utils/dates';

	interface Props {
		schedules: ScheduleItem[];
		eventId?: string;
		editable?: boolean;
		eventDays?: string[];
		locations?: EventLocation[];
		addScheduleForm?: Record<string, unknown>;
		updateScheduleForm?: Record<string, unknown>;
		deleteScheduleForm?: Record<string, unknown>;
	}

	let {
		schedules,
		eventId,
		editable = false,
		eventDays,
		locations,
		addScheduleForm,
		updateScheduleForm,
		deleteScheduleForm
	}: Props = $props();

	let editingId = $state<string | null>(null);
	let addingForDay = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let deleteFormEl = $state<HTMLFormElement | null>(null);

	async function handleDelete(id: string) {
		deletingId = id;
		await tick();
		deleteFormEl?.requestSubmit();
	}

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

<!-- Single delete form — only one instance of deleteScheduleForm ever attached to the DOM -->
{#if deleteScheduleForm}
	<form
		{...deleteScheduleForm}
		bind:this={deleteFormEl}
		class="hidden"
		onsubmit={() => (deletingId = null)}
	>
		<input type="hidden" name="id" value={deletingId ?? ''} />
		{#if eventId}<input type="hidden" name="eventId" value={eventId} />{/if}
	</form>
{/if}

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
					{#if editable && editingId === item.id && updateScheduleForm}
						<ScheduleItemForm
							mode="edit"
							{item}
							{eventId}
							eventDays={eventDays ?? []}
							locations={locations ?? []}
							formData={updateScheduleForm}
							onCancel={() => (editingId = null)}
							onSuccess={() => (editingId = null)}
						/>
					{:else}
						<ScheduleItemCard
							item={itemWithResolvedLocation(item)}
							onEdit={editable ? () => (editingId = item.id) : undefined}
							onDelete={editable && deleteScheduleForm ? () => handleDelete(item.id) : undefined}
						/>
					{/if}
				{/each}

				{#if editable && addScheduleForm}
					{#if addingForDay === dayKey}
						<ScheduleItemForm
							mode="add"
							{eventId}
							eventDays={eventDays ?? []}
							locations={locations ?? []}
							initialDay={toISODate(new Date(dayKey))}
							formData={addScheduleForm}
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

	{#if editable && addScheduleForm}
		{#if addingForDay === 'new'}
			<ScheduleItemForm
				mode="add"
				{eventId}
				eventDays={eventDays ?? []}
				locations={locations ?? []}
				formData={addScheduleForm}
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
