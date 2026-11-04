<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '#lib/components/ui/button';
	import * as Card from '#lib/components/ui/card';
	import XIcon from '@lucide/svelte/icons/x';

	let { eventId, cityId }: { eventId: string; cityId: number } = $props();
	const storageKey = $derived(`event-start-crew-dismissed:${eventId}:${cityId}`);
	// Match SSR until mounted, then read this event/city's persisted dismissal.
	let dismissed = $state(true);
	$effect(() => {
		try {
			dismissed = localStorage.getItem(storageKey) === '1';
		} catch {
			dismissed = false;
		}
	});

	function dismiss() {
		dismissed = true;
		try {
			localStorage.setItem(storageKey, '1');
		} catch {
			// Dismiss for this visit even if storage is unavailable.
		}
	}
</script>

{#if !dismissed}
	<Card.Root class="mb-6" data-testid="start-crew-card">
		<Card.Header>
			<Card.Title>This city doesn't have a crew yet. Want to start one?</Card.Title>
			<Card.Action>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={dismiss}
					aria-label="Dismiss crew suggestion"
					data-testid="dismiss-start-crew"
				>
					<XIcon />
				</Button>
			</Card.Action>
		</Card.Header>
		<Card.Footer>
			<Button
				href={`${resolve('/crews/create')}?city=${cityId}`}
				size="sm"
				data-testid="start-crew-link">Start a crew</Button
			>
		</Card.Footer>
	</Card.Root>
{/if}
