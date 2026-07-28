<script lang="ts">
	import { client } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Field from '$lib/components/ui/field';
	import FormStatus from '$lib/components/layout/FormStatus.svelte';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');
	let success = $state(false);

	async function handleSubmit() {
		error = '';
		success = false;

		if (newPassword !== confirmPassword) {
			error = 'New passwords do not match.';
			return;
		}

		loading = true;
		await client.changePassword(
			{ currentPassword, newPassword },
			{
				onError(context) {
					error = context.error.message;
				},
				onSuccess() {
					success = true;
					currentPassword = '';
					newPassword = '';
					confirmPassword = '';
				}
			}
		);
		loading = false;
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
>
	<Field.Group>
		<Field.Field>
			<Field.Label for="current">Current password</Field.Label>
			<Input
				id="current"
				type="password"
				autocomplete="current-password"
				required
				bind:value={currentPassword}
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label for="new">New password</Field.Label>
			<Input
				id="new"
				type="password"
				autocomplete="new-password"
				required
				bind:value={newPassword}
			/>
		</Field.Field>
		<Field.Field>
			<Field.Label for="confirm">Confirm new password</Field.Label>
			<Input
				id="confirm"
				type="password"
				autocomplete="new-password"
				required
				bind:value={confirmPassword}
			/>
		</Field.Field>

		<FormStatus {error} success={success ? 'Password updated.' : null} />

		<Field.Field orientation="horizontal">
			<Button type="submit" disabled={loading}>
				{loading ? 'Saving…' : 'Change password'}
			</Button>
		</Field.Field>
	</Field.Group>
</form>
