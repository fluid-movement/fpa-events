<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { getEvent, updateEvent } from './data.remote';
	import { page } from '$app/state';

	const eventId = page.params.id;

	if (!eventId) {
		throw new Error('Event ID is required');
	}

	const event = $derived(await getEvent(eventId));
</script>

<h1>Edit Event</h1>

<form {...updateEvent}>
	<label>
		Name:
		<Input {...updateEvent.fields.name.as('text')} value={event.name} />
	</label>

	<label>
		Description:
		<Input {...updateEvent.fields.description.as('text')} value={event.description} />
	</label>

	<label>
		Start Date:
		<Input {...updateEvent.fields.startDate.as('date')} value={event.startDate} />
	</label>

	<label>
		End Date:
		<Input {...updateEvent.fields.endDate.as('date')} value={event.endDate} />
	</label>

	<label>
		Location:
		<Input {...updateEvent.fields.location.as('text')} value={event.location} />
	</label>

	<Button type="submit">Update Event</Button>
</form>
