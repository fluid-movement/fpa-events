<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import type { DateValue } from '@internationalized/date';

	import { createEvent } from './data.remote';

	let dateRange = $state<{ start: DateValue | undefined; end: DateValue | undefined }>({
		start: undefined,
		end: undefined
	});
</script>

<div class="w-full max-w-2xl">
	<form {...createEvent}>
		<Field.Group>
			<Field.Set>
				<Field.Legend>Create a new event</Field.Legend>
				<Field.Description>more information about creating events</Field.Description>
			</Field.Set>
			<Field.Separator />
			<Field.Group>
				<Field.Field>
					<Field.Label for="event-name">Event name</Field.Label>
					<Input
						id="event-name"
						placeholder="Your event name"
						{...createEvent.fields.name.as('text')}
					/>
				</Field.Field>
			</Field.Group>
			<Field.Group>
				<Field.Field>
					<Field.Label for="event-location">Event location</Field.Label>
					<Input
						id="event-location"
						placeholder="Your event location"
						{...createEvent.fields.location.as('text')}
					/>
				</Field.Field>
				<Field.Field>
					<Field.Label>Description</Field.Label>
					<RichTextEditor name="description" placeholder="Info about the event" />
				</Field.Field>
				<Field.Field>
					<Field.Label>Cover image</Field.Label>
					<ImageUpload />
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
					<RangeCalendar bind:value={dateRange} class="rounded-md border" />
					<input type="hidden" name="startDate" value={dateRange.start?.toString() ?? ''} />
					<input type="hidden" name="endDate" value={dateRange.end?.toString() ?? ''} />
				</Field.Field>
			</Field.Group>
			<Field.Separator />
			<Field.Field orientation="horizontal">
				<Button type="submit">Create Event</Button>
			</Field.Field>
		</Field.Group>
	</form>
</div>
