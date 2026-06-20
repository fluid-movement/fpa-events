<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import EventLocationInput from '$lib/components/EventLocationInput.svelte';
	import { parseDate } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
	import { page } from '$app/state';
	import { getEvent, updateEvent } from './data.remote';

	const eventId = page.params.id;

	if (!eventId) {
		throw new Error('Event ID is required');
	}

	const event = $derived(await getEvent(eventId));

	let dateRange = $state<{ start: DateValue | undefined; end: DateValue | undefined }>({
		start: undefined,
		end: undefined
	});

	$effect(() => {
		if (event?.startDate) {
			dateRange = {
				start: parseDate(event.startDate),
				end: parseDate(event.endDate)
			};
		}
	});
</script>

<div class="w-full max-w-2xl">
	<h1 class="mb-6">Edit Event</h1>

	<form {...updateEvent}>
		<Field.Group>
			<Field.Set>
				<Field.Legend>Edit event</Field.Legend>
			</Field.Set>
			<Field.Separator />
			<Field.Group>
				<Field.Field>
					<Field.Label for="event-name">Event name</Field.Label>
					<Input
						id="event-name"
						placeholder="Your event name"
						{...updateEvent.fields.name.as('text')}
						value={event.name}
					/>
				</Field.Field>
			</Field.Group>
			<Field.Group>
				<Field.Field>
					<Field.Label for="event-location">Event location</Field.Label>
					<EventLocationInput
						value={event.location}
						city={event.city ?? undefined}
						country={event.country ?? undefined}
					/>
				</Field.Field>
				<Field.Field>
					<Field.Label>Description</Field.Label>
					<RichTextEditor name="description" value={event.description} placeholder="Info about the event" />
				</Field.Field>
				<Field.Field>
					<Field.Label>Cover image</Field.Label>
					<ImageUpload
						currentUrl={event.picture}
						currentWidth={event.pictureWidth}
						currentHeight={event.pictureHeight}
					/>
				</Field.Field>
				<Field.Field>
					<Field.Label>Event dates</Field.Label>
					{#if dateRange.start && dateRange.end}
						<p class="text-sm text-muted-foreground">
							{dateRange.start} → {dateRange.end}
						</p>
					{:else}
						<p class="text-sm text-muted-foreground">Select a date range</p>
					{/if}
					<RangeCalendar bind:value={dateRange} class="rounded-md border w-fit" />
					<input type="hidden" name="startDate" value={dateRange.start?.toString() ?? ''} />
					<input type="hidden" name="endDate" value={dateRange.end?.toString() ?? ''} />
				</Field.Field>
			</Field.Group>
			<Field.Separator />
			<Field.Field orientation="horizontal">
				<Button type="submit">Update Event</Button>
			</Field.Field>
		</Field.Group>
	</form>
</div>
