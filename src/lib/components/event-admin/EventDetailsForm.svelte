<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import { RangeCalendar } from '$lib/components/ui/range-calendar/index.js';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import EventLocationInput from '$lib/components/EventLocationInput.svelte';
	import Turnstile, { captchaEnabled } from '$lib/components/Turnstile.svelte';
	import { parseDate } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';

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
		updateEventForm: Record<string, unknown>;
		onCancel: () => void;
	}

	let { event, updateEventForm, onCancel }: Props = $props();

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

<form {...updateEventForm} class="max-w-2xl">
	<Field.Group>
		<Field.Field>
			<Field.Label for="event-name">Event name</Field.Label>
			<Input
				id="event-name"
				name="name"
				placeholder="Your event name"
				value={event.name}
				data-testid="event-name-input"
			/>
		</Field.Field>
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
			<RichTextEditor
				name="description"
				value={event.description}
				placeholder="Info about the event"
			/>
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
			<RangeCalendar bind:value={dateRange} class="w-fit rounded-md border" />
			<input type="hidden" name="startDate" value={dateRange.start?.toString() ?? ''} />
			<input type="hidden" name="endDate" value={dateRange.end?.toString() ?? ''} />
		</Field.Field>
		<Field.Separator />
		<Turnstile bind:token />
		<input type="hidden" name="turnstileToken" value={token} />
		<Field.Field orientation="horizontal">
			<Button type="submit" disabled={captchaEnabled && !token} data-testid="save-details">
				Save changes
			</Button>
			<Button type="button" variant="outline" onclick={onCancel} data-testid="cancel-details">
				Cancel
			</Button>
		</Field.Field>
	</Field.Group>
</form>
