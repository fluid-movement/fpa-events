<script lang="ts">
	import { deleteAccount } from './data.remote.ts';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	let confirmed = $state(false);
</script>

<div class="space-y-6">
	<div class="rounded-lg border border-destructive/50 p-6 space-y-4">
		<div class="space-y-1">
			<h2 class="text-lg font-semibold text-destructive">Delete Account</h2>
			<p class="text-sm text-muted-foreground">
				Permanently delete your account and all associated data, including events you created. This
				cannot be undone.
			</p>
		</div>

		<form {...deleteAccount} class="space-y-4">
			<div class="flex items-center gap-3">
				<input
					id="confirm-delete"
					type="checkbox"
					class="size-4 rounded border-input accent-destructive cursor-pointer"
					bind:checked={confirmed}
				/>
				<Label for="confirm-delete" class="text-sm font-normal leading-snug cursor-pointer">
					I understand this action is permanent and cannot be undone
				</Label>
			</div>

			<Button type="submit" variant="destructive" disabled={!confirmed}>Delete Account</Button>
		</form>
	</div>
</div>
