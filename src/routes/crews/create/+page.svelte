<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import * as Field from '#lib/components/ui/field';
	import EventLocationInput from '#lib/components/EventLocationInput.svelte';
	import Turnstile, { captchaEnabled } from '#lib/components/Turnstile.svelte';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import FormStatus from '#lib/components/layout/FormStatus.svelte';
	import { createCrew } from './data.remote';
	let token = $state('');
</script>

<PageShell width="form">
	<PageHeader title="Create a crew" />
	<form {...createCrew} data-testid="crew-form">
		<Field.Group>
			<Field.Field>
				<Field.Label for="crew-name">Crew name</Field.Label>
				<Input id="crew-name" data-testid="crew-name" {...createCrew.fields.name.as('text')} required maxlength={100} />
			</Field.Field>
			<Field.Field>
				<Field.Label>City</Field.Label>
				<EventLocationInput fields={createCrew.fields} />
				<Field.Description>Select a city from the suggestions.</Field.Description>
			</Field.Field>
			{#each createCrew.fields.allIssues() ?? [] as issue}
				<FormStatus error={issue.message} />
			{/each}
			<FormStatus error={createCrew.result?.error} />
			{#if createCrew.result?.crewId}
				<a data-testid="existing-crew" href={resolve('/crews/[id]', { id: createCrew.result.crewId })}>View this city's crew</a>
			{/if}
			<Turnstile bind:token />
			<input {...createCrew.fields.turnstileToken.as('hidden', token)} />
			<Field.Field orientation="horizontal">
				<Button data-testid="crew-submit" type="submit" disabled={(captchaEnabled && !token) || createCrew.pending > 0}>
					{createCrew.pending > 0 ? 'Creating crew…' : 'Create crew'}
				</Button>
			</Field.Field>
		</Field.Group>
	</form>
</PageShell>
