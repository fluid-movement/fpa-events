<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import FormStatus from '$lib/components/layout/FormStatus.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<form method="POST">
	<Field.Group>
		<Field.Field>
			<Field.Label for="name">Name</Field.Label>
			<Input id="name" name="name" type="text" required value={data.name} />
		</Field.Field>

		<Field.Field>
			<Field.Label for="email">Email</Field.Label>
			<Input id="email" type="email" value={data.email} disabled />
			<Field.Description>Email cannot be changed here.</Field.Description>
		</Field.Field>

		<FormStatus error={form?.error} success={form?.success ? 'Profile updated.' : null} />

		<Field.Field orientation="horizontal">
			<Button type="submit">Save changes</Button>
		</Field.Field>
	</Field.Group>
</form>
