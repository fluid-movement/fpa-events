<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import * as Field from '#lib/components/ui/field';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import FormStatus from '#lib/components/layout/FormStatus.svelte';
	import { CREW_LINK_KINDS, CREW_LINK_LABELS, MAX_LINK_URL_LENGTH } from '#lib/crew-links';
	import { saveCrewLinks } from './data.remote';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const linksForm = $derived(saveCrewLinks.for(data.crew.id));
</script>

<PageShell width="form">
	<PageHeader title={`Contact links for ${data.crew.name}`} />
	<Button variant="outline" href={resolve('/crews/[id]', { id: data.crew.id })}>View crew</Button>
	<form {...linksForm} data-testid="crew-links-form">
		<input {...linksForm.fields.crewId.as('hidden', data.crew.id)} />
		<Field.Group>
			<p>Use HTTPS links. Leave a field empty to remove its link.</p>
			{#each CREW_LINK_KINDS as kind (kind)}
				<Field.Field>
					<Field.Label for={`crew-link-${kind}`}>{CREW_LINK_LABELS[kind]}</Field.Label>
					<Input
						id={`crew-link-${kind}`}
						data-testid={`crew-link-input-${kind}`}
						{...linksForm.fields[kind].as(
							'text',
							data.links.find((link) => link.kind === kind)?.url ?? ''
						)}
						maxlength={MAX_LINK_URL_LENGTH}
						placeholder="https://"
					/>
				</Field.Field>
			{/each}
			{#each linksForm.fields.allIssues() ?? [] as issue, i (i)}
				<FormStatus error={issue.message} />
			{/each}
			<FormStatus error={linksForm.result?.error} />
			{#if linksForm.result?.success}<p role="status">Contact links saved.</p>{/if}
			<Button type="submit" data-testid="crew-links-submit" disabled={linksForm.pending > 0}>
				{linksForm.pending > 0 ? 'Saving…' : 'Save links'}
			</Button>
		</Field.Group>
	</form>
</PageShell>
