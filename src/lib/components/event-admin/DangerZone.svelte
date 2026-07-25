<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CheckIcon from '@lucide/svelte/icons/check';

	interface Props {
		eventId: string;
		eventName: string;
		deleteEventForm: Record<string, unknown>;
	}

	let { eventId, eventName, deleteEventForm }: Props = $props();

	let open = $state(false);
	let typedName = $state('');
	let copied = $state(false);

	// Typing the exact name is the only thing that arms the delete button. Note the
	// form below deliberately has no `onsubmit` of its own: overriding it would
	// replace the remote function's handler and fall back to a native submit.
	const confirmed = $derived(typedName.trim() === eventName.trim());

	// Clear the box each time the dialog opens so a previous attempt never carries over.
	$effect(() => {
		if (open) {
			typedName = '';
			copied = false;
		}
	});

	async function copyName() {
		await navigator.clipboard.writeText(eventName);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<!-- Kept low-key: discoverable at the end of the tab, but not competing with the
     content above it. -->
<div
	class="mt-8 flex flex-col gap-3 rounded-lg border border-destructive/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
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
		<TrashIcon class="size-4" />
		Delete Event
	</Button>
</div>

<AlertDialog.Root bind:open>
	<AlertDialog.Content class="sm:max-w-md" data-testid="delete-dialog">
		<AlertDialog.Header>
			<AlertDialog.Title>Delete this event?</AlertDialog.Title>
			<AlertDialog.Description>
				This permanently deletes the event along with its schedule, locations, attendee list and
				invite links. This cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<form {...deleteEventForm} class="space-y-4">
			<input type="hidden" name="eventId" value={eventId} />

			<div class="space-y-2">
				<!-- Single child: Label lays its children out with `flex gap-2`, which would
				     otherwise add visible gaps around the emphasised span. -->
				<Label for="delete-confirm-name">
					<span>
						To confirm, type <span class="font-semibold text-foreground">{eventName}</span> below.
					</span>
				</Label>

				<div class="flex gap-2">
					<Input
						value={eventName}
						disabled
						aria-label="Event name to copy"
						class="font-mono text-xs disabled:opacity-100"
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						onclick={copyName}
						title="Copy event name"
						aria-label="Copy event name"
						data-testid="copy-event-name"
					>
						{#if copied}
							<CheckIcon class="size-4" />
						{:else}
							<CopyIcon class="size-4" />
						{/if}
					</Button>
				</div>

				<Input
					id="delete-confirm-name"
					bind:value={typedName}
					placeholder="Type the event name"
					autocomplete="off"
					autocorrect="off"
					spellcheck={false}
					class="font-mono text-xs"
					data-testid="delete-confirm-input"
				/>
			</div>

			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button" data-testid="cancel-delete">Cancel</AlertDialog.Cancel>
				<Button
					type="submit"
					variant="destructive"
					disabled={!confirmed}
					data-testid="confirm-delete"
				>
					<TrashIcon class="size-4" />
					Delete event
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>
