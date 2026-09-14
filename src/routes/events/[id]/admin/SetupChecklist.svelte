<script module lang="ts">
	export interface ChecklistItem {
		label: string;
		done: boolean;
		/** Where the item links to. Omitted for items with no destination. */
		href?: string;
	}
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CopyToClipboard } from '$lib/hooks/copy-to-clipboard.svelte';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import CircleIcon from '@lucide/svelte/icons/circle';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import XIcon from '@lucide/svelte/icons/x';

	interface Props {
		eventId: string;
		eventName: string;
		items: ChecklistItem[];
		publicUrl: string;
		/** Hidden entirely for events that have already happened. */
		isPast?: boolean;
	}

	let { eventId, eventName, items, publicUrl, isPast = false }: Props = $props();

	const storageKey = $derived(`event-setup-dismissed:${eventId}`);
	const allDone = $derived(items.every((i) => i.done));
	const remaining = $derived(items.filter((i) => !i.done).length);

	// Read on the client only, so SSR and the first client render agree. Not a
	// writable $derived: localStorage isn't a reactive source, and reading it
	// during render would make the server and the first client paint disagree.
	// eslint-disable-next-line svelte/prefer-writable-derived
	let dismissed = $state(true);
	$effect(() => {
		dismissed = localStorage.getItem(storageKey) === '1';
	});

	const visible = $derived(!dismissed && !allDone && !isPast);

	function dismiss() {
		localStorage.setItem(storageKey, '1');
		dismissed = true;
	}

	const clipboard = new CopyToClipboard();
	$effect(() => () => clipboard.dispose());
</script>

{#if visible}
	<div class="surface mb-6 rounded-xl p-5" data-testid="setup-checklist">
		<div class="mb-4 flex items-start justify-between gap-4">
			<div class="space-y-1">
				<h2 class="text-base font-semibold">Finish setting up {eventName}</h2>
				<p class="text-sm text-muted-foreground">
					{remaining}
					{remaining === 1 ? 'step' : 'steps'} left — everything here can be changed later.
				</p>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={dismiss}
				title="Dismiss"
				data-testid="dismiss-checklist"
			>
				<XIcon class="size-4" />
			</Button>
		</div>

		<ul class="space-y-1">
			{#each items as item (item.label)}
				<li>
					{#if item.done || !item.href}
						<div class="flex items-center gap-2.5 px-2 py-1.5 text-sm">
							{#if item.done}
								<CheckCircle2Icon class="size-4 shrink-0 text-primary" />
								<span class="text-muted-foreground line-through">{item.label}</span>
							{:else}
								<CircleIcon class="size-4 shrink-0 text-muted-foreground" />
								<span>{item.label}</span>
							{/if}
						</div>
					{:else}
						<a
							href={item.href}
							class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60"
						>
							<CircleIcon class="size-4 shrink-0 text-muted-foreground" />
							<span>{item.label}</span>
						</a>
					{/if}
				</li>
			{/each}
			<li class="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
				<span class="flex items-center gap-2.5">
					<CircleIcon class="size-4 shrink-0 text-muted-foreground" />
					Share the public page
				</span>
				<Button variant="outline" size="xs" onclick={() => clipboard.write(publicUrl)}>
					<CopyIcon class="size-3.5" />
					{clipboard.copied ? 'Copied' : 'Copy link'}
				</Button>
			</li>
		</ul>
	</div>
{/if}
