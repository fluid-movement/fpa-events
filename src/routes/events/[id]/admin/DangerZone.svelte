<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ConfirmDialog from '$lib/components/layout/ConfirmDialog.svelte';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import { deleteEvent } from './delete-event.remote';

	interface Props {
		eventId: string;
		eventName: string;
	}

	let { eventId, eventName }: Props = $props();

	let open = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
</script>

<!-- Kept low-key: discoverable at the end of the tab, but not competing with the
     content above it. -->
<div
	class="mt-8 flex flex-col gap-3 rounded-xl border border-destructive/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
>
	<div class="min-w-0 space-y-0.5">
		<h2 class="text-sm font-semibold text-destructive">Delete this event</h2>
		<p class="text-sm text-muted-foreground">
			Removes the event and all its data. This cannot be undone.
		</p>
	</div>
	<Button
		variant="outline"
		size="sm"
		onclick={() => (open = true)}
		data-testid="open-delete-dialog"
		class="shrink-0 self-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
	>
		<TrashIcon />
		Delete event
	</Button>
</div>

<!-- Submitted by the dialog. The form deliberately has no `onsubmit` of its own:
     overriding it would replace the remote function's handler and fall back to a
     native submit. -->
<form bind:this={formEl} {...deleteEvent} class="hidden">
	<input type="hidden" name="eventId" value={eventId} />
</form>

<ConfirmDialog
	bind:open
	title="Delete this event?"
	description="This permanently deletes the event along with its schedule, locations, attendee list and invite links. This cannot be undone."
	confirmPhrase={eventName}
	phraseNoun="name"
	confirmLabel="Delete event"
	testIds={{
		content: 'delete-dialog',
		input: 'delete-confirm-input',
		confirm: 'confirm-delete',
		cancel: 'cancel-delete',
		phraseCopy: 'copy-event-name'
	}}
	onconfirm={() => formEl?.requestSubmit()}
>
	{#snippet icon()}
		<TrashIcon />
	{/snippet}
</ConfirmDialog>
