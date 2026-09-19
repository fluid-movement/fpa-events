<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { client } from '#lib/auth-client';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import AuthForm from '#lib/components/AuthForm.svelte';

	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleReset() {
		// Read from `page` rather than `window`: it is available during SSR too,
		// and it stays in step if the query string changes without a reload.
		const token = page.url.searchParams.get('token');

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}
		if (!token) {
			error = 'Invalid reset link';
			return;
		}

		error = '';
		loading = true;
		await client.resetPassword({
			newPassword: password,
			token,
			fetchOptions: {
				onSuccess() {
					goto(resolve('/sign-in'));
				},
				onError(context: { error: { message: string } }) {
					error = context.error.message;
				}
			}
		});
		loading = false;
	}
</script>

<AuthCard title="Set new password" description="Choose a new password for your account">
	<AuthForm
		submitLabel="Reset password"
		pendingLabel="Resetting…"
		{loading}
		{error}
		onsubmit={handleReset}
	>
		<div class="grid gap-2">
			<Label for="password">New Password</Label>
			<Input
				id="password"
				type="password"
				required
				placeholder="New password"
				bind:value={password}
			/>
		</div>
		<div class="grid gap-2">
			<Label for="confirm">Confirm Password</Label>
			<Input
				id="confirm"
				type="password"
				required
				placeholder="Confirm password"
				bind:value={confirmPassword}
			/>
		</div>
	</AuthForm>
</AuthCard>
