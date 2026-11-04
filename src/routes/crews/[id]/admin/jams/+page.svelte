<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Textarea } from '#lib/components/ui/textarea';
	import * as Field from '#lib/components/ui/field';
	import PageShell from '#lib/components/layout/PageShell.svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import FormStatus from '#lib/components/layout/FormStatus.svelte';
	import ConfirmSubmit from '#lib/components/layout/ConfirmSubmit.svelte';
	import VenueLocationPicker from '#lib/components/VenueLocationPicker.svelte';
	import { formatJamWeekday, formatJamTime } from '#lib/utils/dates';
	import { saveJam, deleteJam } from './data.remote';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let editingId = $state('');
	const editing = $derived(data.jams.find((jam) => jam.id === editingId));
</script>

<PageShell width="form">
	<PageHeader title={`Regular jams for ${data.crew.name}`} />
	<Button variant="outline" href={resolve('/crews/[id]/admin', { id: data.crew.id })}
		>Manage crew</Button
	>
	<ul class="flex flex-col gap-4">
		{#each data.jams as jam (jam.id)}
			<li data-testid={`admin-jam-${jam.id}`} class="flex flex-col gap-2">
				<p>{formatJamWeekday(jam.weekday)} {formatJamTime(jam.startTime)} — {jam.venueName}</p>
				{#if jam.note}<p>{jam.note}</p>{/if}
				<Button
					variant="outline"
					data-testid={`edit-jam-${jam.id}`}
					onclick={() => (editingId = jam.id)}>Edit jam</Button
				>
				<ConfirmSubmit
					form={deleteJam.for(jam.id)}
					fields={{ crewId: data.crew.id, id: jam.id }}
					title="Delete regular jam?"
					description="This removes the recurring jam from the crew page."
					confirmLabel="Delete jam"
					testIds={{ confirm: `confirm-delete-jam-${jam.id}` }}
				>
					{#snippet trigger()}<Button variant="outline" data-testid={`delete-jam-${jam.id}`}
							>Delete jam</Button
						>{/snippet}
				</ConfirmSubmit>
			</li>
		{/each}
	</ul>
	{#if editingId}<Button
			variant="outline"
			data-testid="add-another-jam"
			onclick={() => (editingId = '')}>Add another jam</Button
		>{/if}
	{#if editing || data.jams.length < 10}
		{#key editingId}
			{@const jamForm = saveJam.for(editingId || 'new')}
			<form {...jamForm} data-testid="jam-form">
				<h2>{editing ? 'Edit jam' : 'Add jam'}</h2>
				<input {...jamForm.fields.crewId.as('hidden', data.crew.id)} />
				<input {...jamForm.fields.id.as('hidden', editing?.id ?? '')} />
				<Field.Group>
					<Field.Field>
						<Field.Label for="jam-weekday">Weekday</Field.Label>
						<select
							id="jam-weekday"
							data-testid="jam-weekday"
							{...jamForm.fields.weekday.as('select', String(editing?.weekday ?? 0))}
						>
							{#each [0, 1, 2, 3, 4, 5, 6] as weekday (weekday)}
								<option value={String(weekday)}>{formatJamWeekday(weekday)}</option>
							{/each}
						</select>
					</Field.Field>
					<Field.Field>
						<Field.Label for="jam-time">Start time</Field.Label>
						<Input
							id="jam-time"
							data-testid="jam-time"
							{...jamForm.fields.startTime.as('time', editing?.startTime ?? '19:00')}
							required
						/>
					</Field.Field>
					<Field.Field>
						<Field.Label>Venue</Field.Label>
						<VenueLocationPicker
							fields={jamForm.fields}
							name={editing?.venueName ?? ''}
							address={editing?.address ?? ''}
							lat={editing?.latitude ?? data.city.latitude ?? undefined}
							lng={editing?.longitude ?? data.city.longitude ?? undefined}
						/>
					</Field.Field>
					<Field.Field>
						<Field.Label for="jam-note">Note (optional)</Field.Label>
						<Textarea
							id="jam-note"
							data-testid="jam-note"
							{...jamForm.fields.note.as('text', editing?.note ?? '')}
							maxlength={1000}
						/>
					</Field.Field>
					{#each jamForm.fields.allIssues() ?? [] as issue, i (i)}<FormStatus
							error={issue.message}
						/>{/each}
					<Button type="submit" data-testid="save-jam" disabled={jamForm.pending > 0}
						>{jamForm.pending > 0 ? 'Saving…' : 'Save jam'}</Button
					>
				</Field.Group>
			</form>
		{/key}
	{:else}<p>A crew can have at most 10 regular jams.</p>{/if}
</PageShell>
