<script lang="ts">
	import { resolve } from '$app/paths';
	import { signUp } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Turnstile, { captchaEnabled } from '$lib/components/Turnstile.svelte';

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let signedUp = $state(false);
	let token = $state('');
	let turnstile = $state<Turnstile>();

	async function handleSignUp() {
		error = '';
		loading = true;
		await signUp.email({
			email,
			password,
			name: `${firstName} ${lastName}`.trim(),
			fetchOptions: {
				headers: { 'x-captcha-response': token },
				onSuccess() {
					signedUp = true;
				},
				onError(context) {
					error = context.error.message;
					turnstile?.reset();
				}
			}
		});
		loading = false;
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<Card.Root class="w-full max-w-sm bg-card/80 backdrop-blur-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Create Account</Card.Title>
			<Card.Description>Enter your details to get started</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if signedUp}
				<div class="text-center">
					<p class="text-sm text-muted-foreground">
						If an account exists for <strong>{email}</strong>, a verification email has been sent.
						If you don't see it, try signing in — we'll send you a new one.
					</p>
					<p class="mt-4 text-sm text-muted-foreground">
						<a href={resolve('/sign-in')} class="underline hover:text-foreground">Go to sign in</a>
					</p>
				</div>
			{:else}
				<form class="grid gap-4" onsubmit={(e) => { e.preventDefault(); handleSignUp(); }}>
					<div class="grid grid-cols-2 gap-3">
						<div class="grid gap-2">
							<Label for="first-name">First name</Label>
							<Input id="first-name" placeholder="Max" required bind:value={firstName} />
						</div>
						<div class="grid gap-2">
							<Label for="last-name">Last name</Label>
							<Input id="last-name" placeholder="Robinson" required bind:value={lastName} />
						</div>
					</div>
					<div class="grid gap-2">
						<Label for="email">Email</Label>
						<Input id="email" type="email" placeholder="you@example.com" required bind:value={email} />
					</div>
					<div class="grid gap-2">
						<Label for="password">Password</Label>
						<Input id="password" type="password" required bind:value={password} />
					</div>
					{#if error}
						<p class="text-sm text-destructive">{error}</p>
					{/if}
					<Turnstile bind:this={turnstile} bind:token />
					<Button type="submit" class="w-full" disabled={loading || (captchaEnabled && !token)}>
						{loading ? 'Creating account…' : 'Create Account'}
					</Button>
				</form>
				<p class="mt-4 text-center text-sm text-muted-foreground">
					Already have an account?
					<a href={resolve('/sign-in')} class="underline hover:text-foreground">Sign in</a>
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
