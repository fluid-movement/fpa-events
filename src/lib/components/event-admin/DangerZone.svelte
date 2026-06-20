<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import TrashIcon from '@lucide/svelte/icons/trash-2';

	interface Props {
		eventId: string;
		eventName: string;
		deleteEventForm: Record<string, unknown>;
	}

	let { eventId, eventName, deleteEventForm }: Props = $props();

	function confirmDelete(event: SubmitEvent) {
		if (!confirm(`Delete "${eventName}"? This cannot be undone.`)) event.preventDefault();
	}
</script>

<div class="mt-16 rounded-lg border border-destructive/30 p-6">
	<h2 class="mb-1 text-base font-semibold text-destructive">Danger Zone</h2>
	<p class="mb-4 text-sm text-muted-foreground">
		Permanently delete this event and all its data. This cannot be undone.
	</p>
	<form {...deleteEventForm} onsubmit={confirmDelete}>
		<input type="hidden" name="eventId" value={eventId} />
		<Button type="submit" variant="destructive" size="sm">
			<TrashIcon class="size-4" />
			Delete Event
		</Button>
	</form>
</div>
