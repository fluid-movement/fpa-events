<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import * as Field from '#lib/components/ui/field';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.js';
	import RichTextEditor from '#lib/components/RichTextEditor.svelte';
	import ImageUpload from '#lib/components/ImageUpload.svelte';
	import EventLocationInput from '#lib/components/EventLocationInput.svelte';
	import Turnstile, { captchaEnabled } from '#lib/components/Turnstile.svelte';
	import { parseDate } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
	import { updateEvent } from '../event-details.remote';

	interface EventDetails {
		name: string;
		description: string;
		startDate: string;
		endDate: string;
		location: string;
		city: string | null;
		country: string | null;
		picture: string | null;
		pictureWidth: number | null;
		pictureHeight: number | null;
	}

	interface Props {
		event: EventDetails;
		onCancel: () => void;
	}

	let { event, onCancel }: Props = $props();

	let token = $state('');

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

<form {...updateEvent} class="max-w-2xl">
	<Field.Group>
		<Field.Field>
			<Field.Label for="event-name">Event name</Field.Label>
			<Input
				id="event-name"
				placeholder="Your event name"
				data-testid="event-name-input"
				{...updateEvent.fields.name.as('text', event.name)}
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label for="event-location">Event location</Field.Label>
			<EventLocationInput
				fields={updateEvent.fields}
				value={event.location}
				city={event.city ?? undefined}
				country={event.country ?? undefined}
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label>Description</Field.Label>
			<RichTextEditor
				field={updateEvent.fields.description}
				value={event.description}
				placeholder="Info about the event"
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label>Cover image</Field.Label>
			<ImageUpload
				fields={updateEvent.fields}
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
			<RangeCalendar bind:value={dateRange} class="w-fit rounded-md border" />
			<input {...updateEvent.fields.startDate.as('hidden', dateRange.start?.toString() ?? '')} />
			<input {...updateEvent.fields.endDate.as('hidden', dateRange.end?.toString() ?? '')} />
		</Field.Field>
		<Field.Separator />
		<Turnstile bind:token />
		<input {...updateEvent.fields.turnstileToken.as('hidden', token)} />
		<Field.Field orientation="horizontal">
			<Button
				type="submit"
				disabled={(captchaEnabled && !token) || updateEvent.pending > 0}
				data-testid="save-details"
			>
				{updateEvent.pending > 0 ? 'Saving…' : 'Save changes'}
			</Button>
			<Button type="button" variant="outline" onclick={onCancel} data-testid="cancel-details">
				Cancel
			</Button>
		</Field.Field>
	</Field.Group>
</form>
