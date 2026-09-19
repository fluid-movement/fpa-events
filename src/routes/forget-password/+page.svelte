<script lang="ts">
	import { client } from '#lib/auth-client';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { resolve } from '$app/paths';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import Turnstile from '#lib/components/Turnstile.svelte';

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

{#snippet backToSignIn()}
	<a href={resolve('/sign-in')} class="underline hover:text-foreground">Back to Sign In</a>
{/snippet}

<AuthCard
	title="Forgot password"
	description="Enter your email to receive a reset link"
	footer={backToSignIn}
>
	{#if sent}
		<p class="text-center text-sm text-muted-foreground">
			Check your inbox — we sent a reset link to <strong>{email}</strong>.
		</p>
	{:else}
		<AuthForm
			submitLabel="Send reset link"
			pendingLabel="Sending…"
			{loading}
			{error}
			captchaToken={token}
			onsubmit={handleSubmit}
		>
			<div class="grid gap-2">
				<Label for="email">Email</Label>
				<Input id="email" type="email" placeholder="you@example.com" required bind:value={email} />
			</div>

			{#snippet aboveSubmit()}
				<Turnstile bind:this={turnstile} bind:token />
			{/snippet}
		</AuthForm>
	{/if}
</AuthCard>
