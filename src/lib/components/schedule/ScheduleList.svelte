<script
	lang="ts"
	generics="AddInput extends RemoteFormInput, UpdateInput extends RemoteFormInput, DeleteInput extends RemoteFormInput"
>
	import { Button } from '#lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ScheduleItemCard from './ScheduleItemCard.svelte';
	import ConfirmSubmit from '#lib/components/layout/ConfirmSubmit.svelte';
	import EmptyState from '#lib/components/layout/EmptyState.svelte';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import ScheduleItemForm from './ScheduleItemForm.svelte';
	import type { ScheduleItem, EventLocation } from '#lib/types/event';
	import { toISODate } from '#lib/utils/dates';
	import { groupBy } from '#lib/utils/collections';
	import type { RemoteForm, RemoteFormInput } from '$app/server';

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

	let deleting = $state<ScheduleItem | null>(null);
	let confirmOpen = $state(false);

	function askDelete(item: ScheduleItem) {
		deleting = item;
		confirmOpen = true;
	}

	const groupedSchedules = $derived.by(() => {
		const sorted = [...schedules].sort(
			(a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
		);
		return [...groupBy(sorted, (item) => new Date(item.startDate).toDateString()).entries()];
	});

	function formatDayHeading(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	}

	/**
	 * The public page joins the location name in its load; the manage area has
	 * only the id and the separately-loaded location list to match it against.
	 */
	function withLocationName(item: ScheduleItem): ScheduleItem {
		if (item.locationName || !item.locationId) return item;
		const name = locations?.find((l) => l.id === item.locationId)?.name ?? null;
		return { ...item, locationName: name };
	}
</script>

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
							item={withLocationName(item)}
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

{#if deleteScheduleForm}
	<ConfirmSubmit
		bind:open={confirmOpen}
		form={deleteScheduleForm}
		fields={{ id: deleting?.id, eventId }}
		title="Delete this schedule item?"
		description="“{deleting?.name ?? ''}” will be removed from the schedule. This cannot be undone."
		confirmLabel="Delete item"
		testIds={{ confirm: 'confirm-delete-schedule-item' }}
	>
		{#snippet icon()}
			<TrashIcon />
		{/snippet}
	</ConfirmSubmit>
{/if}
