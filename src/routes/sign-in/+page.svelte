<script lang="ts">
	import { signIn } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { resolve } from '$app/paths';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSignIn() {
		error = '';
		loading = true;
		await signIn.email(
			{ email, password, callbackURL: '/dashboard' },
			{
				onError(context) {
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
			<Card.Title class="text-2xl">Sign In</Card.Title>
			<Card.Description>Enter your email and password to continue</Card.Description>
		</Card.Header>
		<Card.Content>
			<form class="grid gap-4" onsubmit={(e) => { e.preventDefault(); handleSignIn(); }}>
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
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? 'Signing in…' : 'Sign In'}
				</Button>
			</form>
			<p class="mt-4 text-center text-sm text-muted-foreground">
				Don't have an account?
				<a href={resolve('/sign-up')} class="underline hover:text-foreground">Sign up</a>
			</p>
		</Card.Content>
	</Card.Root>
</div>
