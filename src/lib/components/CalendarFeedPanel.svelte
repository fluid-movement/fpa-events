<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import CopyField from '$lib/components/layout/CopyField.svelte';
	import ConfirmDialog from '$lib/components/layout/ConfirmDialog.svelte';
	import CalendarPlusIcon from '@lucide/svelte/icons/calendar-plus';
	import { regenerateToken } from '$lib/api/calendar.remote';

	let {
		token,
		class: className
	}: {
		token: string;
		class?: string;
	} = $props();

	let confirmOpen = $state(false);
	let regenerating = $state(false);
	let formEl: HTMLFormElement | undefined = $state();

	// Clears the spinner once the call hands back a new token.
	$effect(() => {
		if (regenerateToken.result?.calendarToken) regenerating = false;
	});

	// Built in the browser because they need the current origin.
	const feedUrl = $derived(
		browser ? `${window.location.origin}/api/calendar/${token}/feed.ics` : ''
	);
	const googleCalendarUrl = $derived(
		browser
			? `https://www.google.com/calendar/render?cid=webcal://${window.location.host}/api/calendar/${token}/feed.ics`
			: ''
	);
</script>

<div class={className}>
	<div class="space-y-4">
		<p class="text-sm text-muted-foreground">
			Add your attending events to Google Calendar, Apple Calendar, or any app that supports ICS
			subscriptions. The feed updates automatically.
		</p>

		{#if browser && feedUrl}
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

	<!-- Submitted by the dialog: the remote form needs a real submit event, and
	     the dialog's confirm button lives inside the alert-dialog portal. -->
	<form
		bind:this={formEl}
		{...regenerateToken}
		class="hidden"
		onsubmit={() => {
			regenerating = true;
			confirmOpen = false;
		}}
	></form>

	<ConfirmDialog
		bind:open={confirmOpen}
		title="Regenerate calendar link?"
		description="The current link stops working immediately. Any calendar app already subscribed to it will need the new one."
		confirmLabel="Yes, regenerate"
		pendingLabel="Regenerating…"
		pending={regenerating}
		testIds={{ confirm: 'confirm-regenerate-calendar' }}
		onconfirm={() => formEl?.requestSubmit()}
	/>
</div>
