<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import * as Field from '#lib/components/ui/field';
	import FormStatus from '#lib/components/layout/FormStatus.svelte';
	import { updateProfile } from './data.remote';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const result = $derived(updateProfile.result);
</script>

<form {...updateProfile}>
	<Field.Group>
		<Field.Field>
			<Field.Label for="name">Name</Field.Label>
			<Input id="name" {...updateProfile.fields.name.as('text', data.name)} required />
		</Field.Field>

		<Field.Field>
			<Field.Label for="email">Email</Field.Label>
			<Input id="email" type="email" value={data.email} disabled />
			<Field.Description>Email cannot be changed here.</Field.Description>
		</Field.Field>

		<FormStatus error={result?.error} success={result?.success ? 'Profile updated.' : null} />

		<Field.Field orientation="horizontal">
			<Button type="submit" disabled={updateProfile.pending > 0}>
				{updateProfile.pending > 0 ? 'Saving…' : 'Save changes'}
			</Button>
		</Field.Field>
	</Field.Group>
</form>
