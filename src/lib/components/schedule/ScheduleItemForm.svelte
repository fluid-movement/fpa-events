<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import * as Select from '$lib/components/ui/select';
	import type { ScheduleItem, EventLocation } from '$lib/types/event';
	import { toISODate } from '$lib/utils/dates';

	interface Props {
		mode: 'add' | 'edit';
		item?: ScheduleItem;
		eventId?: string;
		eventDays: string[];
		locations: EventLocation[];
		initialDay?: string | null;
		formData: Record<string, unknown>;
		onCancel: () => void;
		onSuccess: () => void;
	}

	let { mode, item, eventId, eventDays, locations, initialDay, formData, onCancel, onSuccess }: Props =
		$props();

	let selectedDay = $state<string | null>(null);
	let startTime = $state('');
	let endTime = $state('');
	let locationId = $state('');

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
	{...formData}
	class={mode === 'edit'
		? 'space-y-3 rounded-lg border bg-card p-4'
		: 'space-y-3 rounded-lg border border-dashed bg-muted/30 p-4'}
	onsubmit={() => onSuccess()}
>
	{#if eventId}<input type="hidden" name="eventId" value={eventId} />{/if}
	{#if mode === 'edit'}
		<input type="hidden" name="id" value={item?.id} />
	{/if}

	<div class="grid grid-cols-2 gap-3">
		<!-- Name -->
		<div class="col-span-2">
			<label for="schedule-name" class="text-xs font-medium text-muted-foreground">Name *</label>
			<Input
				id="schedule-name"
				name="name"
				value={mode === 'edit' ? item?.name : undefined}
				required
				placeholder="Activity name"
				class="mt-1"
			/>
		</div>

		<!-- Day picker -->
		<div class="col-span-2">
			<span class="text-xs font-medium text-muted-foreground">Day *</span>
			<div class="mt-1 flex flex-wrap gap-2">
				{#each eventDays as day (day)}
					<button
						type="button"
						onclick={() => (selectedDay = day)}
						class="rounded-md border px-3 py-1 text-sm transition-colors {selectedDay === day
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-input bg-background hover:bg-accent'}"
					>
						{formatDayButton(day)}
					</button>
				{/each}
			</div>
		</div>

		<!-- Start time -->
		<div>
			<label for="schedule-start-time" class="text-xs font-medium text-muted-foreground"
				>Start time *</label
			>
			<Input id="schedule-start-time" type="time" bind:value={startTime} required class="mt-1" />
		</div>

		<!-- End time -->
		<div>
			<label for="schedule-end-time" class="text-xs font-medium text-muted-foreground"
				>End time *</label
			>
			<Input id="schedule-end-time" type="time" bind:value={endTime} required class="mt-1" />
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

		<!-- Location -->
		<div class="col-span-2">
			<span class="text-xs font-medium text-muted-foreground">Location</span>
			<div class="mt-1">
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
			</div>
		</div>

		<!-- Description -->
		<div class="col-span-2">
			<span class="text-xs font-medium text-muted-foreground">Description</span>
			<div class="mt-1">
				<RichTextEditor
					name="description"
					value={mode === 'edit' ? (item?.description ?? '') : ''}
					placeholder="Optional"
				/>
			</div>
		</div>
	</div>

	<div class="flex justify-end gap-2">
		<Button type="button" variant="ghost" size="sm" onclick={onCancel}>Cancel</Button>
		<Button type="submit" size="sm">
			{mode === 'edit' ? 'Save' : 'Add Item'}
		</Button>
	</div>
</form>
