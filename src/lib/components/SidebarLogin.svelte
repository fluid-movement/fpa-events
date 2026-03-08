<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '$lib/auth-client';
	import { Button } from './ui/button';
	import UserIcon from '@lucide/svelte/icons/user';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import LogInIcon from '@lucide/svelte/icons/log-in';

	const session = client.useSession();
</script>

{#if $session.data?.user}
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2 px-1">
			<div class="bg-primary/10 rounded-full p-1.5">
				<UserIcon class="size-4 text-primary" />
			</div>
			<div class="min-w-0">
				<p class="text-sm font-medium truncate">{$session.data.user.name}</p>
				<p class="text-xs text-muted-foreground truncate">{$session.data.user.email}</p>
			</div>
		</div>
		<Button
			variant="outline"
			size="sm"
			class="w-full"
			onclick={() =>
				client.signOut({ fetchOptions: { onSuccess: () => goto(resolve('/')) } })}
		>
			<LogOutIcon class="size-4" />
			Sign Out
		</Button>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		<Button href={resolve('/sign-in')} class="w-full">
			<LogInIcon class="size-4" />
			Sign In
		</Button>
		<Button href={resolve('/sign-up')} variant="outline" class="w-full">
			Create Account
		</Button>
	</div>
{/if}
