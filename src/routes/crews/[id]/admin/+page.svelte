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
	import { updateCrew } from './data.remote';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let token = $state('');
</script>

<PageShell width="form">
	<PageHeader title="Manage crew" />
	<form {...updateCrew} data-testid="crew-form">
		<Field.Group>
			<Field.Field>
				<Field.Label for="crew-name">Crew name</Field.Label>
				<Input id="crew-name" data-testid="crew-name" {...updateCrew.fields.name.as('text', data.crew.name)} required maxlength={100} />
			</Field.Field>
			<Field.Field>
				<Field.Label>City</Field.Label>
				<EventLocationInput fields={updateCrew.fields}
					value={`${data.city.city}, ${data.city.country}`}
					city={data.city.city}
					country={data.city.country}
					latitude={data.city.latitude}
					longitude={data.city.longitude} />
				<Field.Description>Select a city from the suggestions.</Field.Description>
			</Field.Field>
			{#each updateCrew.fields.allIssues() ?? [] as issue}
				<FormStatus error={issue.message} />
			{/each}
			<FormStatus error={updateCrew.result?.error} />
			{#if updateCrew.result?.crewId}
				<a data-testid="existing-crew" href={resolve('/crews/[id]', { id: updateCrew.result.crewId })}>View this city's crew</a>
			{/if}
			<Turnstile bind:token />
			<input {...updateCrew.fields.turnstileToken.as('hidden', token)} />
			<Field.Field orientation="horizontal">
				<Button data-testid="crew-submit" type="submit" disabled={(captchaEnabled && !token) || updateCrew.pending > 0}>
					{updateCrew.pending > 0 ? 'Saving…' : 'Save changes'}
				</Button>
			</Field.Field>
		</Field.Group>
	</form>
</PageShell>
