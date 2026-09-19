<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import EventLocationInput from '#lib/components/EventLocationInput.svelte';
	import * as Field from '#lib/components/ui/field';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.js';
	import RichTextEditor from '#lib/components/RichTextEditor.svelte';
	import ImageUpload from '#lib/components/ImageUpload.svelte';
	import Turnstile, { captchaEnabled } from '#lib/components/Turnstile.svelte';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import type { DateValue } from '@internationalized/date';

	import { createEvent } from './data.remote';

	let dateRange = $state<{ start: DateValue | undefined; end: DateValue | undefined }>({
		start: undefined,
		end: undefined
	});
	let token = $state('');
</script>

<PageShell width="form">
	<PageHeader
		title="Create an event"
		description="Tell people what's happening, where and when. You can change any of it later."
		back={{ href: resolve('/events'), label: 'All events' }}
	/>

	<form {...createEvent}>
		<Field.Group>
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
					<EventLocationInput fields={createEvent.fields} />
					<Field.Description>City and country — e.g. "Munich, Germany"</Field.Description>
				</Field.Field>
				<Field.Field>
					<Field.Label>Description</Field.Label>
					<RichTextEditor
						field={createEvent.fields.description}
						placeholder="Info about the event"
					/>
				</Field.Field>
				<Field.Field>
					<Field.Label>Cover image</Field.Label>
					<ImageUpload fields={createEvent.fields} />
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
					<input
						{...createEvent.fields.startDate.as('hidden', dateRange.start?.toString() ?? '')}
					/>
					<input {...createEvent.fields.endDate.as('hidden', dateRange.end?.toString() ?? '')} />
				</Field.Field>
			</Field.Group>
			<Field.Separator />
			<Turnstile bind:token />
			<input {...createEvent.fields.turnstileToken.as('hidden', token)} />
			<Field.Field orientation="horizontal">
				<Button type="submit" disabled={(captchaEnabled && !token) || createEvent.pending > 0}>
					{createEvent.pending > 0 ? 'Creating event…' : 'Create event'}
				</Button>
			</Field.Field>
		</Field.Group>
	</form>
</PageShell>
