<script
	lang="ts"
	generics="AddInput extends RemoteFormInput, UpdateInput extends RemoteFormInput, DeleteInput extends RemoteFormInput"
>
	import { tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ScheduleItemCard from './ScheduleItemCard.svelte';
	import ConfirmDialog from '$lib/components/layout/ConfirmDialog.svelte';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import ScheduleItemForm from './ScheduleItemForm.svelte';
	import type { ScheduleItem, EventLocation } from '$lib/types/event';
	import { toISODate } from '$lib/utils/dates';
	import type { RemoteForm, RemoteFormInput } from '@sveltejs/kit';

	interface Props {
		schedules: ScheduleItem[];
		eventId?: string;
		editable?: boolean;
		eventDays?: string[];
		locations?: EventLocation[];
		addScheduleForm?: RemoteForm<AddInput, unknown>;
		updateScheduleForm?: RemoteForm<UpdateInput, unknown>;
		deleteScheduleForm?: RemoteForm<DeleteInput, unknown>;
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

	let pending = $state<ScheduleItem | null>(null);
	let confirmOpen = $state(false);

	function askDelete(item: ScheduleItem) {
		pending = item;
		confirmOpen = true;
	}

	async function handleDelete(id: string) {
		confirmOpen = false;
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
		<EmptyState
			icon={CalendarClockIcon}
			title="No schedule items yet"
			description={editable
				? 'Add activities so attendees know what happens when.'
				: 'The organizers have not published a schedule yet.'}
			size="compact"
		/>
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
							onDelete={editable && deleteScheduleForm ? () => askDelete(item) : undefined}
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

<ConfirmDialog
	bind:open={confirmOpen}
	title="Delete this schedule item?"
	description="“{pending?.name ?? ''}” will be removed from the schedule. This cannot be undone."
	confirmLabel="Delete item"
	testIds={{ confirm: 'confirm-delete-schedule-item' }}
	onconfirm={() => pending && handleDelete(pending.id)}
>
	{#snippet icon()}
		<TrashIcon />
	{/snippet}
</ConfirmDialog>
