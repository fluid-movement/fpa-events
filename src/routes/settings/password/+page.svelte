<script lang="ts">
	import { client } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

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

<form class="space-y-4" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
	<div class="grid gap-2">
		<Label for="current">Current Password</Label>
		<Input id="current" type="password" required bind:value={currentPassword} />
	</div>
	<div class="grid gap-2">
		<Label for="new">New Password</Label>
		<Input id="new" type="password" required bind:value={newPassword} />
	</div>
	<div class="grid gap-2">
		<Label for="confirm">Confirm New Password</Label>
		<Input id="confirm" type="password" required bind:value={confirmPassword} />
	</div>

	{#if error}
		<p class="text-sm text-destructive">{error}</p>
	{/if}
	{#if success}
		<p class="text-sm text-green-600">Password updated.</p>
	{/if}

	<Button type="submit" disabled={loading}>
		{loading ? 'Saving…' : 'Change Password'}
	</Button>
</form>
