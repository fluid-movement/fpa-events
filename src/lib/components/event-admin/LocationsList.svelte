<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import type { EventLocation } from '$lib/types/event';

	interface Props {
		locations: EventLocation[];
		onAddClick: () => void;
		eventId: string;
		deleteAction: Record<string, unknown>;
	}

	let { locations, onAddClick, eventId, deleteAction }: Props = $props();

	let deletingId = $state<number | null>(null);
	let deleteFormEl = $state<HTMLFormElement | null>(null);

	async function handleDelete(id: number) {
		deletingId = id;
		await tick();
		deleteFormEl?.requestSubmit();
	}
</script>

<!-- Single delete form — one instance of deleteAction ever in the DOM -->
<form
	{...deleteAction}
	bind:this={deleteFormEl}
	class="hidden"
	onsubmit={() => (deletingId = null)}
>
	<input type="hidden" name="id" value={deletingId ?? ''} />
	<input type="hidden" name="eventId" value={eventId} />
</form>

<div class="mb-3 flex items-center justify-between">
	<h2 class="text-sm font-semibold">Locations</h2>
	<Button variant="outline" size="sm" onclick={onAddClick}>
		<PlusIcon class="size-4" />
		Add Location
	</Button>
</div>

{#if locations.length === 0}
	<p class="text-sm text-muted-foreground">No locations yet.</p>
{:else}
	<div class="divide-y rounded-lg border">
		{#each locations as loc (loc.id)}
			<div class="flex items-center justify-between gap-4 px-4 py-2.5">
				<div class="min-w-0">
					<p class="text-sm font-medium">{loc.name}</p>
					{#if loc.address}
						<p class="truncate text-xs text-muted-foreground">{loc.address}</p>
					{/if}
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					class="size-7 shrink-0 text-muted-foreground hover:text-destructive"
					onclick={() => handleDelete(loc.id)}
				>
					<TrashIcon class="size-3.5" />
				</Button>
			</div>
		{/each}
	</div>
{/if}
