<script lang="ts">
	import { client } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { resolve } from '$app/paths';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');

	async function handleSubmit() {
		if (!email) return;
		error = '';
		loading = true;
		await client.requestPasswordReset(
			{ email, redirectTo: '/reset-password' },
			{
				onSuccess() {
					sent = true;
				},
				onError(context: { error: { message: string } }) {
					error = context.error.message;
				}
			}
		);
		loading = false;
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<Card.Root class="w-full max-w-sm bg-card/80 backdrop-blur-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Forgot Password</Card.Title>
			<Card.Description>Enter your email to receive a reset link</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if sent}
				<p class="text-sm text-center text-muted-foreground">
					Check your inbox — we sent a reset link to <strong>{email}</strong>.
				</p>
			{:else}
				<form class="grid gap-4" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					<div class="grid gap-2">
						<Label for="email">Email</Label>
						<Input id="email" type="email" placeholder="you@example.com" required bind:value={email} />
					</div>
					{#if error}
						<p class="text-sm text-destructive">{error}</p>
					{/if}
					<Button type="submit" class="w-full" disabled={loading}>
						{loading ? 'Sending…' : 'Send Reset Link'}
					</Button>
				</form>
			{/if}
			<p class="mt-4 text-center text-sm text-muted-foreground">
				<a href={resolve('/sign-in')} class="underline hover:text-foreground">Back to Sign In</a>
			</p>
		</Card.Content>
	</Card.Root>
</div>
