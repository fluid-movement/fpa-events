<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { browser } from '$app/environment';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');

	function getToken() {
		if (!browser) return '';
		return new URLSearchParams(window.location.search).get('token') ?? '';
	}

	async function handleReset() {
		const token = getToken();
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

<div class="flex min-h-[60vh] items-center justify-center">
	<Card.Root class="w-full max-w-sm bg-card/80 backdrop-blur-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Set New Password</Card.Title>
			<Card.Description>Choose a new password for your account</Card.Description>
		</Card.Header>
		<Card.Content>
			<form class="grid gap-4" onsubmit={(e) => { e.preventDefault(); handleReset(); }}>
				<div class="grid gap-2">
					<Label for="password">New Password</Label>
					<Input id="password" type="password" required placeholder="New password" bind:value={password} />
				</div>
				<div class="grid gap-2">
					<Label for="confirm">Confirm Password</Label>
					<Input id="confirm" type="password" required placeholder="Confirm password" bind:value={confirmPassword} />
				</div>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Resetting…' : 'Reset Password'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
