<script lang="ts" generics="FormInput extends RemoteFormInput">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import * as Select from '$lib/components/ui/select';
	import type { ScheduleItem, EventLocation } from '$lib/types/event';
	import { toISODate } from '$lib/utils/dates';
	import type { RemoteForm, RemoteFormInput } from '@sveltejs/kit';

	interface Props {
		mode: 'add' | 'edit';
		item?: ScheduleItem;
		eventId?: string;
		eventDays: string[];
		locations: EventLocation[];
		initialDay?: string | null;
		formData: RemoteForm<FormInput, unknown>;
		onCancel: () => void;
		onSuccess: () => void;
	}

	let {
		mode,
		item,
		eventId,
		eventDays,
		locations,
		initialDay,
		formData,
		onCancel,
		onSuccess
	}: Props = $props();

	let selectedDay = $state<string | null>(null);
	let startTime = $state('');
	let endTime = $state('');
	let locationId = $state('');
	let dayError = $state(false);

	function formatDayButton(isoDate: string) {
		return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	const selectedLocationName = $derived(
		locations.find((l) => String(l.id) === locationId)?.name ?? 'No location'
	);

	$effect(() => {
		if (mode === 'edit' && item) {
			selectedDay = toISODate(new Date(item.startDate));
			startTime = new Date(item.startDate).toTimeString().slice(0, 5);
			endTime = new Date(item.endDate).toTimeString().slice(0, 5);
			locationId = item.locationId ? String(item.locationId) : '';
		} else if (mode === 'add') {
			selectedDay = initialDay ?? null;
			startTime = '';
			endTime = '';
			locationId = '';
		}
	});
</script>

<form
	{...formData.enhance(async ({ submit }) => {
		if (!selectedDay || !startTime || !endTime) {
			dayError = true;
			return;
		}
		dayError = false;
		await submit();
		if (!formData.fields.issues()?.length) {
			onSuccess();
		}
	})}
	class={mode === 'edit'
		? 'surface space-y-4 rounded-xl p-4'
		: 'space-y-4 rounded-xl border border-dashed bg-muted/30 p-4'}
>
	{#if eventId}<input type="hidden" name="eventId" value={eventId} />{/if}
	{#if mode === 'edit'}
		<input type="hidden" name="id" value={item?.id} />
	{/if}

	<Field.Group class="gap-4">
		<Field.Field>
			<Field.Label for="schedule-name">Name *</Field.Label>
			<Input
				id="schedule-name"
				name="name"
				value={mode === 'edit' ? item?.name : undefined}
				required
				placeholder="Activity name"
			/>
		</Field.Field>

		<Field.Field>
			<Field.Label>Day *</Field.Label>
			<!-- A toggle group rather than a date input: the event is a handful of
			     days long, so picking one should be a single tap. -->
			<div class="flex flex-wrap gap-2">
				{#each eventDays as day (day)}
					<Button
						type="button"
						variant={selectedDay === day ? 'default' : 'outline'}
						size="sm"
						aria-pressed={selectedDay === day}
						onclick={() => {
							selectedDay = day;
							dayError = false;
						}}
					>
						{formatDayButton(day)}
					</Button>
				{/each}
			</div>
			{#if dayError}
				<p class="text-xs text-destructive">Pick a day before saving.</p>
			{/if}
		</Field.Field>

		<div class="grid grid-cols-2 gap-4">
			<Field.Field>
				<Field.Label for="schedule-start-time">Start time *</Field.Label>
				<Input id="schedule-start-time" type="time" bind:value={startTime} required />
			</Field.Field>
			<Field.Field>
				<Field.Label for="schedule-end-time">End time *</Field.Label>
				<Input id="schedule-end-time" type="time" bind:value={endTime} required />
			</Field.Field>
		</div>

		<!-- Hidden date inputs -->
		<input
			type="hidden"
			name="startDate"
			value={selectedDay && startTime ? `${selectedDay}T${startTime}` : ''}
		/>
		<input
			type="hidden"
			name="endDate"
			value={selectedDay && endTime ? `${selectedDay}T${endTime}` : ''}
		/>

		<Field.Field>
			<Field.Label>Location</Field.Label>
			<Select.Root type="single" bind:value={locationId}>
				<Select.Trigger class="w-full">
					{selectedLocationName}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="" label="No location">No location</Select.Item>
					{#each locations as location (location.id)}
						<Select.Item value={String(location.id)} label={location.name}>
							{location.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<input type="hidden" name="locationId" value={locationId} />
		</Field.Field>

		<Field.Field>
			<Field.Label>Description</Field.Label>
			<RichTextEditor
				name="description"
				value={mode === 'edit' ? (item?.description ?? '') : ''}
				placeholder="Optional"
			/>
		</Field.Field>

		<!-- Same order everywhere: confirming action first, cancel beside it. -->
		<Field.Field orientation="horizontal">
			<Button type="submit" size="sm" disabled={formData.pending > 0}>
				{formData.pending > 0
					? mode === 'edit'
						? 'Saving…'
						: 'Adding…'
					: mode === 'edit'
						? 'Save'
						: 'Add item'}
			</Button>
			<Button type="button" variant="outline" size="sm" onclick={onCancel}>Cancel</Button>
		</Field.Field>
	</Field.Group>
</form>
