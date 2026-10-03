<script lang="ts">
	import { browser } from '$app/env';
	import { Button } from '#lib/components/ui/button';
	import CopyField from '#lib/components/layout/CopyField.svelte';
	import ConfirmSubmit from '#lib/components/layout/ConfirmSubmit.svelte';
	import CalendarPlusIcon from '@lucide/svelte/icons/calendar-plus';
	import { regenerateToken } from '#lib/api/calendar.remote';

	let { token, class: className }: { token: string; class?: string } = $props();

	let confirmOpen = $state(false);

	// Built in the browser because they need the current origin.
	const feedPath = $derived(`/api/calendar/${token}/feed.ics`);
	const feedUrl = $derived(browser ? `${window.location.origin}${feedPath}` : '');
	const googleCalendarUrl = $derived(
		browser
			? `https://www.google.com/calendar/render?cid=webcal://${window.location.host}${feedPath}`
			: ''
	);
</script>

<div class={className}>
	<div class="space-y-4">
		<p class="text-sm text-muted-foreground">
			Add your attending events to Google Calendar, Apple Calendar, or any app that supports ICS
			subscriptions. The feed updates automatically.
		</p>

		{#if feedUrl}
			<CopyField value={feedUrl} data-testid="calendar-feed-url" copyTestId="calendar-feed-copy" />

			<Button
				variant="outline"
				onclick={() => window.open(googleCalendarUrl, '_blank', 'noopener,noreferrer')}
			>
				<CalendarPlusIcon />
				Add to Google Calendar
			</Button>
		{/if}

		<div class="border-t pt-4">
			<Button
				variant="ghost"
				size="sm"
				class="text-muted-foreground"
				onclick={() => (confirmOpen = true)}
				data-testid="regenerate-calendar-link"
			>
				Regenerate link
			</Button>
		</div>
	</div>

	<ConfirmSubmit
		bind:open={confirmOpen}
		form={regenerateToken}
		title="Regenerate calendar link?"
		description="The current link stops working immediately. Any calendar app already subscribed to it will need the new one."
		confirmLabel="Yes, regenerate"
		pendingLabel="Regenerating…"
		testIds={{ confirm: 'confirm-regenerate-calendar' }}
	/>
</div>
