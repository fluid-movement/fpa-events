<script lang="ts">
	import { client, signIn } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { resolve } from '$app/paths';
	import Turnstile, { captchaEnabled } from '$lib/components/Turnstile.svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let unverified = $state(false);
	let resent = $state(false);
	let token = $state('');
	let turnstile = $state<Turnstile>();

	async function handleSignIn() {
		error = '';
		unverified = false;
		resent = false;
		loading = true;
		await signIn.email(
			{ email, password, callbackURL: '/dashboard' },
			{
				headers: { 'x-captcha-response': token },
				onError(context) {
					if (context.error.code === 'EMAIL_NOT_VERIFIED') {
						unverified = true;
						error = 'Please verify your email before signing in.';
					} else {
						error = context.error.message;
					}
					turnstile?.reset();
				}
			}
		);
		loading = false;
	}

	async function resendVerification() {
		resent = false;
		await client.sendVerificationEmail(
			{ email, callbackURL: '/' },
			{
				headers: { 'x-captcha-response': token },
				onSuccess() {
					resent = true;
				},
				onError(ctx) {
					error = ctx.error.message;
					turnstile?.reset();
				}
			}
		);
	}
</script>

<div class="flex min-h-[60vh] items-center justify-center">
	<Card.Root class="surface-glass w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-xl md:text-2xl">Sign in</Card.Title>
			<Card.Description>Enter your email and password to continue</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				class="grid gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					handleSignIn();
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
				<div class="grid gap-2">
					<div class="flex items-center justify-between">
						<Label for="password">Password</Label>
						<a
							href={resolve('/forget-password')}
							class="text-xs text-muted-foreground hover:underline"
						>
							Forgot password?
						</a>
					</div>
					<Input id="password" type="password" required bind:value={password} />
				</div>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				{#if unverified}
					<div class="flex flex-col gap-2">
						<Button
							type="button"
							variant="outline"
							class="w-full"
							disabled={captchaEnabled && !token}
							onclick={resendVerification}
						>
							Resend verification email
						</Button>
						{#if resent}
							<p class="text-center text-sm text-muted-foreground">Verification email sent!</p>
						{/if}
					</div>
				{/if}
				<Turnstile bind:this={turnstile} bind:token />
				<Button type="submit" class="w-full" disabled={loading || (captchaEnabled && !token)}>
					{loading ? 'Signing in…' : 'Sign in'}
				</Button>
			</form>
			<p class="mt-4 text-center text-sm text-muted-foreground">
				Don't have an account?
				<a href={resolve('/sign-up')} class="underline hover:text-foreground">Sign up</a>
			</p>
		</Card.Content>
	</Card.Root>
</div>
