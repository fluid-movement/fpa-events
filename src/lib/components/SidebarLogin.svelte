<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '$lib/auth-client';
	import { Button } from './ui/button';
	import UserIcon from '@lucide/svelte/icons/user';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import LogInIcon from '@lucide/svelte/icons/log-in';

	let { onNavigate = () => {} }: { onNavigate?: () => void } = $props();

	const session = client.useSession();
</script>

{#if $session.data?.user}
	<div class="flex flex-col gap-2" data-testid="sidebar-auth" data-state="signed-in">
		<div class="flex items-center gap-2 px-1">
			<div class="rounded-full bg-primary/10 p-1.5">
				<UserIcon class="size-4 text-primary" />
			</div>
			<div class="min-w-0">
				<p class="truncate text-sm font-medium">{$session.data.user.name}</p>
				<p class="truncate text-xs text-muted-foreground">{$session.data.user.email}</p>
			</div>
		</div>
		<Button
			variant="outline"
			size="sm"
			class="w-full"
			onclick={() => {
				onNavigate();
				client.signOut({ fetchOptions: { onSuccess: () => goto(resolve('/')) } });
			}}
		>
			<LogOutIcon class="size-4" />
			Sign out
		</Button>
	</div>
{:else}
	<div class="flex flex-col gap-2" data-testid="sidebar-auth" data-state="signed-out">
		<Button href={resolve('/sign-in')} class="w-full" onclick={onNavigate}>
			<LogInIcon class="size-4" />
			Sign in
		</Button>
		<Button href={resolve('/sign-up')} variant="outline" class="w-full" onclick={onNavigate}>
			Create account
		</Button>
	</div>
{/if}
