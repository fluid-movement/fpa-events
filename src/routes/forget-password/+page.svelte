<script lang="ts">
	import { client } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { resolve } from '$app/paths';
	import Turnstile, { captchaEnabled } from '$lib/components/Turnstile.svelte';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');
	let token = $state('');
	let turnstile = $state<Turnstile>();

	async function handleSubmit() {
		if (!email) return;
		error = '';
		loading = true;
		await client.requestPasswordReset(
			{ email, redirectTo: '/reset-password' },
			{
				headers: { 'x-captcha-response': token },
				onSuccess() {
					sent = true;
				},
				onError(context: { error: { message: string } }) {
					error = context.error.message;
					turnstile?.reset();
				}
			}
		);
		loading = false;
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<Card.Root class="surface-glass w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-xl md:text-2xl">Forgot password</Card.Title>
			<Card.Description>Enter your email to receive a reset link</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if sent}
				<p class="text-center text-sm text-muted-foreground">
					Check your inbox — we sent a reset link to <strong>{email}</strong>.
				</p>
			{:else}
				<form
					class="grid gap-4"
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<div class="grid gap-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							required
							bind:value={email}
						/>
					</div>
					{#if error}
						<p class="text-sm text-destructive">{error}</p>
					{/if}
					<Turnstile bind:this={turnstile} bind:token />
					<Button type="submit" class="w-full" disabled={loading || (captchaEnabled && !token)}>
						{loading ? 'Sending…' : 'Send reset link'}
					</Button>
				</form>
			{/if}
			<p class="mt-4 text-center text-sm text-muted-foreground">
				<a href={resolve('/sign-in')} class="underline hover:text-foreground">Back to Sign In</a>
			</p>
		</Card.Content>
	</Card.Root>
</div>
