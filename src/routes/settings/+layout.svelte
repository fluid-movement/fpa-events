<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

</script>

<div class="max-w-2xl mx-auto">
	<div class="space-y-2 pb-6">
		<h1>Settings</h1>
		<p class="text-muted-foreground">Manage your account settings.</p>
	</div>

	<div class="mb-6 flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
		<a
			href={resolve('/settings/profile')}
			class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {page.url.pathname.startsWith(resolve('/settings/profile')) ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
		>
			Profile
		</a>
		<a
			href={resolve('/settings/password')}
			class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {page.url.pathname.startsWith(resolve('/settings/password')) ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
		>
			Password
		</a>
		<a
			href={resolve('/settings/privacy')}
			data-testid="settings-tab-privacy"
			class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {page.url.pathname.startsWith(resolve('/settings/privacy')) ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
		>
			Privacy
		</a>
		<a
			href={resolve('/settings/account')}
			class="rounded-md px-4 py-1.5 text-sm font-medium transition-colors {page.url.pathname.startsWith(resolve('/settings/account')) ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}"
		>
			Account
		</a>
	</div>

	{@render children()}
</div>
