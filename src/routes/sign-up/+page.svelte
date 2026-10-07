<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { safeRedirectPath, withRedirect } from '#lib/utils/urls';
	import { signUp } from '#lib/auth-client';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import AuthCard from '#lib/components/AuthCard.svelte';
	import AuthForm from '#lib/components/AuthForm.svelte';
	import Turnstile from '#lib/components/Turnstile.svelte';

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let signedUp = $state(false);
	let token = $state('');
	let turnstile = $state<Turnstile>();

	// Carried over from /sign-in so an invitee without an account still lands on
	// the invite: the verification link signs them in and goes here.
	const requested = $derived(page.url.searchParams.get('redirect'));

	async function handleSignUp() {
		error = '';
		loading = true;
		await signUp.email({
			email,
			password,
			name: `${firstName} ${lastName}`.trim(),
			callbackURL: safeRedirectPath(requested, '/'),
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

{#snippet signInLink()}
	Already have an account?
	<a href={withRedirect(resolve('/sign-in'), requested)} class="underline hover:text-foreground"
		>Sign in</a
	>
{/snippet}

<!-- The footer drops away on the confirmation screen, which offers its own link. -->
<AuthCard
	title="Create account"
	description="Enter your details to get started"
	footer={signedUp ? undefined : signInLink}
>
	{#if signedUp}
		<div class="text-center">
			<p class="text-sm text-muted-foreground">
				If an account exists for <strong>{email}</strong>, a verification email has been sent. If
				you don't see it, try signing in — we'll send you a new one.
			</p>
			<p class="mt-4 text-sm text-muted-foreground">
				<a
					href={withRedirect(resolve('/sign-in'), requested)}
					class="underline hover:text-foreground">Go to sign in</a
				>
			</p>
		</div>
	{:else}
		<AuthForm
			submitLabel="Create account"
			pendingLabel="Creating account…"
			{loading}
			{error}
			captchaToken={token}
			onsubmit={handleSignUp}
		>
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

			{#snippet aboveSubmit()}
				<Turnstile bind:this={turnstile} bind:token />
			{/snippet}
		</AuthForm>
	{/if}
</AuthCard>
