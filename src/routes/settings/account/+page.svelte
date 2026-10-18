<script lang="ts">
	import { Button } from '#lib/components/ui/button';
	import ConfirmSubmit from '#lib/components/layout/ConfirmSubmit.svelte';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { Input } from '#lib/components/ui/input';
	import { Label } from '#lib/components/ui/label';
	import { deleteAccount } from './data.remote';

	let open = $state(false);
	let password = $state('');
</script>

<div class="space-y-6">
	<div class="space-y-4 rounded-xl border border-destructive/25 p-5 md:p-6">
		<div class="space-y-1">
			<h2 class="font-semibold text-destructive">Delete account</h2>
			<p class="text-sm text-muted-foreground">
				Permanently delete your account and all associated data, including events you created. This
				cannot be undone.
			</p>
		</div>

		<Button
			variant="outline"
			onclick={() => {
				password = '';
				open = true;
			}}
			data-testid="open-delete-account"
			class="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
		>
			<TrashIcon />
			Delete account
		</Button>
	</div>
</div>

<ConfirmSubmit
	bind:open
	form={deleteAccount}
	fields={{ _password: password }}
	closeOnConfirm={false}
	title="Delete your account?"
	description="This permanently deletes your account, the events you created, and your RSVPs. It cannot be undone."
	confirmLabel="Delete account"
	pendingLabel="Deleting…"
	testIds={{ content: 'delete-account-dialog', confirm: 'confirm-delete-account' }}
>
	{#snippet body()}
		<div class="space-y-2">
			<Label for="delete-account-password">Enter your password to confirm</Label>
			<Input
				id="delete-account-password"
				type="password"
				autocomplete="current-password"
				bind:value={password}
				data-testid="delete-account-password"
			/>
			{#each deleteAccount.fields._password.issues() ?? [] as issue (issue.message)}
				<p class="text-sm text-destructive" data-testid="delete-account-error">{issue.message}</p>
			{/each}
		</div>
	{/snippet}
	{#snippet icon()}
		<TrashIcon />
	{/snippet}
</ConfirmSubmit>
