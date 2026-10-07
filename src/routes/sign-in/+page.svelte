<script lang="ts">
	import { client, signIn } from '#lib/auth-client';
	import { Button } from '#lib/components/ui/button';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { safeRedirectPath, withRedirect } from '#lib/utils/urls';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import Turnstile, { captchaEnabled } from '#lib/components/Turnstile.svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let unverified = $state(false);
	let resent = $state(false);
	let token = $state('');
	let turnstile = $state<Turnstile>();

	// Where to land after signing in: the page that sent the user here (an
	// invite link, say), else the dashboard. Same-origin paths only.
	const requested = $derived(page.url.searchParams.get('redirect'));
	const next = $derived(safeRedirectPath(requested, '/dashboard'));

	async function handleSignIn() {
		error = '';
		unverified = false;
		resent = false;
		loading = true;
		await signIn.email(
			{ email, password, callbackURL: next },
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
			{ email, callbackURL: safeRedirectPath(requested, '/') },
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

<AuthCard title="Sign in" description="Enter your email and password to continue">
	<AuthForm
		submitLabel="Sign in"
		pendingLabel="Signing in…"
		{loading}
		{error}
		captchaToken={token}
		onsubmit={handleSignIn}
	>
		<div class="grid gap-2">
			<Label for="email">Email</Label>
			<Input id="email" type="email" placeholder="you@example.com" required bind:value={email} />
		</div>
		<div class="grid gap-2">
			<div class="flex items-center justify-between">
				<Label for="password">Password</Label>
				<a href={resolve('/forget-password')} class="text-xs text-muted-foreground hover:underline">
					Forgot password?
				</a>
			</div>
			<Input id="password" type="password" required bind:value={password} />
		</div>

		{#snippet aboveSubmit()}
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
		{/snippet}
	</AuthForm>

	{#snippet footer()}
		Don't have an account?
		<a href={withRedirect(resolve('/sign-up'), requested)} class="underline hover:text-foreground"
			>Sign up</a
		>
	{/snippet}
</AuthCard>
