<script lang="ts">
	import Button from "$lib/components/ui/button/button.svelte";
	import Input from "$lib/components/ui/input/input.svelte";
	import { createEvent } from "./data.remote";
</script>

<h1>Create Event</h1>
<form {...createEvent}>
    name:<Input {...createEvent.fields.name.as('text')}/>
    description:<Input {...createEvent.fields.description.as('text')}/>
    start date:<Input {...createEvent.fields.startDate.as('date')}/>
    end date:<Input {...createEvent.fields.endDate.as('date')}/>
    location:<Input {...createEvent.fields.location.as('text')}/>
    <Button type="submit">Create Event</Button>
</form>