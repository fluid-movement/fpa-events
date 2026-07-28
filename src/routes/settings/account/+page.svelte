<script lang="ts">
	import { deleteAccount } from './data.remote.ts';
	import { Button } from '$lib/components/ui/button';
	import ConfirmDialog from '$lib/components/layout/ConfirmDialog.svelte';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	let open = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
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

		<!-- Submitted by the dialog; no `onsubmit` of its own so the remote
		     function's handler stays in place. -->
		<form bind:this={formEl} {...deleteAccount} class="hidden"></form>

		<Button
			variant="outline"
			onclick={() => (open = true)}
			data-testid="open-delete-account"
			class="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
		>
			<TrashIcon />
			Delete account
		</Button>
	</div>
</div>

<ConfirmDialog
	bind:open
	title="Delete your account?"
	description="This permanently deletes your account, the events you created, and your RSVPs. It cannot be undone."
	confirmLabel="Delete account"
	testIds={{ content: 'delete-account-dialog', confirm: 'confirm-delete-account' }}
	onconfirm={() => formEl?.requestSubmit()}
>
	{#snippet icon()}
		<TrashIcon />
	{/snippet}
</ConfirmDialog>
