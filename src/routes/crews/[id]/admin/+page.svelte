<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import * as Field from '#lib/components/ui/field';
	import ImageUpload from '#lib/components/ImageUpload.svelte';
	import RichTextEditor from '#lib/components/RichTextEditor.svelte';
	import { bodyLanguageOptions } from '#lib/translate';
	import EventLocationInput from '#lib/components/EventLocationInput.svelte';
	import Turnstile, { captchaEnabled } from '#lib/components/Turnstile.svelte';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import FormStatus from '#lib/components/layout/FormStatus.svelte';
	import { updateCrew } from './data.remote';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const formAction = $derived(updateCrew.for(data.crew.id));
	let token = $state('');
</script>

<PageShell width="form">
	<PageHeader title="Manage crew" />
	<Button
		href={resolve('/crews/[id]/admin/members', { id: data.crew.id })}
		data-testid="manage-crew-members">Manage members and invitations</Button
	>
	<Button
		href={resolve('/crews/[id]/admin/links', { id: data.crew.id })}
		data-testid="manage-crew-links">Manage contact links</Button
	>
	<Button
		href={resolve('/crews/[id]/admin/jams', { id: data.crew.id })}
		data-testid="manage-crew-jams">Manage regular jams</Button
	>
	<form {...formAction} data-testid="crew-form">
		<Field.Group>
			<Field.Field>
				<Field.Label for="crew-name">Crew name</Field.Label>
				<Input
					id="crew-name"
					data-testid="crew-name"
					{...formAction.fields.name.as('text', data.crew.name)}
					required
					maxlength={100}
				/>
			</Field.Field>
			<Field.Field>
				<Field.Label>City</Field.Label>
				<EventLocationInput
					fields={formAction.fields}
					value={`${data.city.city}, ${data.city.country}`}
					city={data.city.city}
					country={data.city.country}
					latitude={data.city.latitude}
					longitude={data.city.longitude}
				/>
				<Field.Description>Select a city from the suggestions.</Field.Description>
			</Field.Field>
			<Field.Field>
				<Field.Label>Banner image</Field.Label>
				<ImageUpload
					fields={formAction.fields}
					currentUrl={data.crew.picture}
					currentWidth={data.crew.pictureWidth}
					currentHeight={data.crew.pictureHeight}
				/>
			</Field.Field>
			<Field.Field>
				<Field.Label>About the crew</Field.Label>
				<RichTextEditor field={formAction.fields.body} value={data.crew.body ?? ''} />
			</Field.Field>
			<Field.Field>
				<Field.Label for="body-language">Body language</Field.Label>
				<select
					id="body-language"
					data-testid="crew-body-language"
					{...formAction.fields.bodyLang.as('select', data.crew.bodyLang ?? '')}
				>
					<option value="">Select a language</option>
					{#each bodyLanguageOptions as language (language.value)}
						<option value={language.value}>{language.label}</option>
					{/each}
				</select>
			</Field.Field>
			{#each formAction.fields.allIssues() ?? [] as issue, i (i)}
				<FormStatus error={issue.message} />
			{/each}
			<FormStatus error={formAction.result?.error} />
			{#if formAction.result?.crewId}
				<a
					data-testid="existing-crew"
					href={resolve('/crews/[id]', { id: formAction.result.crewId })}>View this city's crew</a
				>
			{/if}
			<Turnstile bind:token />
			<input {...formAction.fields.turnstileToken.as('hidden', token)} />
			<Field.Field orientation="horizontal">
				<Button
					data-testid="crew-submit"
					type="submit"
					disabled={(captchaEnabled && !token) || formAction.pending > 0}
				>
					{formAction.pending > 0 ? 'Saving…' : 'Save changes'}
				</Button>
			</Field.Field>
		</Field.Group>
	</form>
</PageShell>
