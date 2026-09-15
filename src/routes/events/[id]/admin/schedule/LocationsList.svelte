<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Section from '$lib/components/layout/Section.svelte';
	import ConfirmSubmit from '$lib/components/layout/ConfirmSubmit.svelte';
	import EmptyState from '$lib/components/layout/EmptyState.svelte';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import type { EventLocation } from '$lib/types/event';
	import { deleteEventLocation } from './locations.remote';

	interface Props {
		locations: EventLocation[];
		onAddClick: () => void;
		eventId: string;
	}

	let { locations, onAddClick, eventId }: Props = $props();

	// Deleting a location detaches it from any schedule item using it, so it gets
	// a confirmation like every other destructive action in the app.
	let pending = $state<EventLocation | null>(null);
	let confirmOpen = $state(false);

	function askDelete(loc: EventLocation) {
		pending = loc;
		confirmOpen = true;
	}
</script>

<Section title="Locations">
	{#snippet action()}
		<Button variant="outline" size="sm" onclick={onAddClick}>
			<PlusIcon />
			Add location
		</Button>
	{/snippet}

	{#if locations.length === 0}
		<EmptyState
			icon={MapPinIcon}
			title="No locations yet"
			description="Add a venue so schedule items can point at somewhere."
			size="compact"
		/>
	{:else}
		<div class="surface divide-y rounded-xl">
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
						size="icon-sm"
						class="shrink-0 text-muted-foreground hover:text-destructive"
						aria-label="Delete {loc.name}"
						onclick={() => askDelete(loc)}
					>
						<TrashIcon class="size-3.5" />
					</Button>
				</div>
			{/each}
		</div>
	{/if}
</Section>

<ConfirmSubmit
	bind:open={confirmOpen}
	form={deleteEventLocation}
	fields={{ id: pending?.id, eventId }}
	title="Delete this location?"
	description="“{pending?.name ??
		''}” will be removed, and any schedule item using it will fall back to no location."
	confirmLabel="Delete location"
	testIds={{ confirm: 'confirm-delete-location' }}
>
	{#snippet icon()}
		<TrashIcon />
	{/snippet}
</ConfirmSubmit>
